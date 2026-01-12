
import React, { useState, useMemo, useRef } from 'react';
import { TBMEntry, TeamCategory, TeamOption, TBMAnalysisResult } from '../types';
import { BarChart2, PieChart, Users, TrendingUp, BrainCircuit, Activity, Layers, Target, Download, Share2, FileText, Sparkles, Microscope, Database, Info, FileBox, Hexagon, Radar, ShieldCheck, Upload, HardDrive } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface SafetyDataLabProps {
    entries: TBMEntry[];
    teams: TeamOption[];
    onBackupData: (scope: 'ALL' | 'TBM' | 'RISK') => void; // [NEW]
    onRestoreData: (files: FileList) => void; // [NEW]
}

type Tab = 'OVERALL' | 'CATEGORY' | 'TEAM';

// --- SVG Chart Components ---

// 1. Radar Chart (Spider Web) for 5 Metrics - [UPDATED] Expanded ViewBox & Layout
const RadarChart = ({ data }: { data: number[] }) => {
    // Metrics: Log, Focus, Voice, PPE, Participation
    const size = 320; // Increased canvas size to prevent label clipping
    const center = size / 2;
    const radius = 90; // Adjusted radius relative to size
    const labels = ["일지", "집중도", "음성", "보호구", "참여도"];
    
    // Helper to get coordinates
    const getCoords = (value: number, index: number, total: number, offset = 0) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
        // Normalize value (assuming max is 100) -> scale to radius
        const r = ((value / 100) * radius) + offset;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Background polygons (webs)
    const webs = [0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => {
        const points = labels.map((_, idx) => {
            const { x, y } = getCoords(100 * scale, idx, labels.length);
            return `${x},${y}`;
        }).join(" ");
        return <polygon key={i} points={points} fill="none" stroke="#E2E8F0" strokeWidth="1" />;
    });

    // Data polygon
    const dataPoints = data.map((val, idx) => {
        const { x, y } = getCoords(val, idx, labels.length);
        return `${x},${y}`;
    }).join(" ");

    // Axis lines
    const axes = labels.map((_, idx) => {
        const { x, y } = getCoords(100, idx, labels.length);
        return <line key={idx} x1={center} y1={center} x2={x} y2={y} stroke="#E2E8F0" strokeWidth="1" />;
    });

    // Labels - [UPDATED] Pushed further out
    const labelEls = labels.map((label, idx) => {
        const { x, y } = getCoords(100, idx, labels.length, 35); // 35px offset for text
        return (
            <text key={idx} x={x} y={y} fontSize="12" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fill="#475569">
                {label}
            </text>
        );
    });

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            {webs}
            {axes}
            <polygon points={dataPoints} fill="rgba(99, 102, 241, 0.2)" stroke="#6366F1" strokeWidth="2" />
            {data.map((val, idx) => {
                const { x, y } = getCoords(val, idx, labels.length);
                return (
                    <g key={idx} className="group">
                        <circle cx={x} cy={y} r="4" fill="#6366F1" stroke="white" strokeWidth="2" className="cursor-pointer hover:scale-150 transition-transform"/>
                        <title>{labels[idx]}: {val}점</title>
                    </g>
                );
            })}
            {labelEls}
        </svg>
    );
};

// 2. Simple Trend Line Chart - [UPDATED] Better Visualization
const TrendChart = ({ data }: { data: number[] }) => {
    const width = 300;
    const height = 100; // Increased height
    const padding = 10;
    
    if (data.length < 2) return (
        <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            데이터 수집 중... (최소 2건 필요)
        </div>
    );

    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    
    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - min) / (max - min || 1)) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(" ");

    const lastPoint = points.split(' ').pop()?.split(',');

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            {/* Gradient Area */}
            <defs>
                <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                </linearGradient>
            </defs>
            <path d={`M ${points.split(' ')[0].split(',')[0]},${height} L ${points} L ${points.split(' ').pop()?.split(',')[0]},${height} Z`} fill="url(#trendGradient)" stroke="none" />
            <path d={`M ${points}`} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            
            {/* Last Point Indicator */}
            {lastPoint && (
                <circle cx={lastPoint[0]} cy={lastPoint[1]} r="4" fill="#10B981" stroke="white" strokeWidth="2" className="animate-pulse"/>
            )}
        </svg>
    );
};

export const SafetyDataLab: React.FC<SafetyDataLabProps> = ({ entries, teams, onBackupData, onRestoreData }) => {
    const [activeTab, setActiveTab] = useState<Tab>('OVERALL');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const restoreInputRef = useRef<HTMLInputElement>(null); // [NEW]

    // --- Advanced Statistics Logic ---
    const stats = useMemo(() => {
        const totalEntries = entries.length;
        const totalRisks = entries.reduce((acc, e) => acc + (e.riskFactors?.length || 0), 0);
        
        // Safety Grade Calculation (S, A, B, C)
        const validScores = entries
            .filter(e => e.videoAnalysis?.score !== undefined)
            .map(e => e.videoAnalysis!.score);
        
        const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
        
        let grade = 'C';
        let gradeColor = 'text-slate-500';
        let gradeBg = 'bg-slate-100';
        
        if (avgScore >= 90) { grade = 'S'; gradeColor = 'text-violet-600'; gradeBg = 'bg-violet-100'; }
        else if (avgScore >= 80) { grade = 'A'; gradeColor = 'text-indigo-600'; gradeBg = 'bg-indigo-100'; }
        else if (avgScore >= 70) { grade = 'B'; gradeColor = 'text-emerald-600'; gradeBg = 'bg-emerald-100'; }
        else { grade = 'C'; gradeColor = 'text-amber-600'; gradeBg = 'bg-amber-100'; }

        // Radar Data Aggregation
        // Log(30), Focus(30), Voice(20), PPE(20), Participation(normalized to 100)
        let sumLog=0, sumFocus=0, sumVoice=0, sumPPE=0;
        let count = 0;
        
        entries.forEach(e => {
            if (e.videoAnalysis?.rubric) {
                sumLog += (e.videoAnalysis.rubric.logQuality || 0) / 30 * 100;
                sumFocus += (e.videoAnalysis.rubric.focus || 0) / 30 * 100;
                sumVoice += (e.videoAnalysis.rubric.voice || 0) / 20 * 100;
                sumPPE += (e.videoAnalysis.rubric.ppe || 0) / 20 * 100;
                count++;
            }
        });
        
        const radarData = count > 0 
            ? [Math.round(sumLog/count), Math.round(sumFocus/count), Math.round(sumVoice/count), Math.round(sumPPE/count), 85] // Participation hardcoded avg for demo
            : [0,0,0,0,0];

        // Trend Data (Last 10 entries scores)
        const sortedEntries = [...entries].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const trendData = sortedEntries.slice(-15).map(e => e.videoAnalysis?.score || 0);

        // Category Breakdown
        const catStats: Record<string, { count: number, scoreSum: number }> = {};
        entries.forEach(e => {
            const t = teams.find(team => team.id === e.teamId);
            const c = t?.category || '기타';
            if(!catStats[c]) catStats[c] = {count:0, scoreSum:0};
            catStats[c].count++;
            catStats[c].scoreSum += (e.videoAnalysis?.score || 0);
        });
        const categoryData = Object.entries(catStats).map(([cat, d]) => ({
            category: cat,
            count: d.count,
            avgScore: Math.round(d.scoreSum / d.count)
        })).sort((a,b) => b.avgScore - a.avgScore);

        return { 
            totalEntries, totalRisks, avgScore, 
            grade, gradeColor, gradeBg,
            radarData, trendData, categoryData
        };
    }, [entries, teams]);

    // --- AI Insight Generation ---
    const generateDeepInsight = async () => {
        setIsAnalyzing(true);
        try {
            const apiKey = process.env.API_KEY || '';
            const ai = new GoogleGenAI({ apiKey });
            
            const prompt = `
                Role: Construction Safety Data Scientist.
                Analyze this site data:
                - Grade: ${stats.grade} (Avg Score: ${stats.avgScore})
                - Total Activities: ${stats.totalEntries}
                - Risks Found: ${stats.totalRisks}
                - Strongest Area based on Radar: ${stats.radarData.indexOf(Math.max(...stats.radarData)) === 0 ? 'Log Quality' : 'PPE Compliance'}
                
                Output a professional markdown report in Korean.
                Structure:
                1. 🔍 **Executive Summary**: Current safety posture analysis.
                2. 📊 **Data-Driven Patterns**: Correlation between TBM frequency and accident prevention.
                3. 🚀 **Strategic Recommendations**: Actionable steps to reach 'S' Grade.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            setAiReport(response.text || "분석 결과가 없습니다.");
        } catch (error) {
            console.error(error);
            alert("AI 분석 중 오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRestoreClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (confirm(`선택한 ${e.target.files.length}개의 파일을 통해 데이터베이스를 복구하시겠습니까?`)) {
                onRestoreData(e.target.files);
            }
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen p-4 md:p-8 animate-fade-in pb-24 font-sans text-slate-800">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <Hexagon size={20} strokeWidth={2.5} />
                        <span className="text-xs font-black uppercase tracking-widest">Safety Intelligence Unit</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-2">
                        안전 데이터 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">심층 연구소</span>
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        현장의 모든 안전 활동을 데이터 포인트로 변환하여 예측 가능한 안전 모델을 구축합니다.
                    </p>
                </div>
                <button 
                    onClick={generateDeepInsight}
                    disabled={isAnalyzing}
                    className="group relative flex items-center gap-3 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-70 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                    {isAnalyzing ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <Sparkles size={18} className="text-yellow-400" />}
                    <span>AI Deep Research 실행</span>
                </button>
            </div>

            {/* Main Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 1. Safety Grade Card (Big) - [UPDATED] Fixed Min-Height for Balance */}
                <div className="col-span-12 md:col-span-4 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden min-h-[360px]">
                    <div className={`absolute inset-0 opacity-5 ${stats.gradeBg}`}></div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 z-10">Current Safety Grade</h3>
                    
                    <div className="relative z-10 flex items-center justify-center">
                        {/* Glowing Ring */}
                        <div className={`absolute w-40 h-40 rounded-full blur-3xl opacity-40 ${stats.gradeBg.replace('bg-', 'bg-')}`}></div>
                        <span className={`text-[120px] font-black leading-none tracking-tighter ${stats.gradeColor} drop-shadow-sm`}>
                            {stats.grade}
                        </span>
                        <div className={`absolute -right-4 -top-2 px-3 py-1 rounded-full text-xs font-bold text-white ${stats.grade === 'S' ? 'bg-violet-500' : 'bg-slate-800'}`}>
                            RANK
                        </div>
                    </div>
                    
                    <div className="mt-6 text-center z-10">
                        <p className="text-3xl font-black text-slate-800">{stats.avgScore}<span className="text-lg text-slate-400">점</span></p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">전체 평균 안전 점수</p>
                    </div>
                </div>

                {/* 2. Radar Analysis (Hexagon Chart) - [UPDATED] Fixed Min-Height */}
                <div className="col-span-12 md:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[360px]">
                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Radar size={18} className="text-indigo-500"/> 역량 분석 (Competency)
                        </h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center h-full">
                        <RadarChart data={stats.radarData} />
                    </div>
                    <p className="text-center text-[10px] text-slate-400 font-bold mt-2 shrink-0">
                        5대 핵심 안전 지표 균형도
                    </p>
                </div>

                {/* 3. Stats Vertical Stack - [UPDATED] Fixed Min-Height to Match Neighbors */}
                <div className="col-span-12 md:col-span-4 flex flex-col gap-6 min-h-[360px]">
                    {/* Trend Card */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                                <TrendingUp size={18} className="text-emerald-500"/> 성장 트렌드
                            </h3>
                            <p className="text-xs text-slate-400">최근 15회 활동 점수 추이</p>
                        </div>
                        <div className="mt-4 flex-1 flex items-end">
                            <TrendChart data={stats.trendData} />
                        </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4 flex-none h-[120px]">
                        <div className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col justify-between">
                            <Database size={20} className="text-indigo-400 mb-2"/>
                            <div>
                                <span className="text-2xl font-black">{stats.totalEntries}</span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Total Data</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 flex flex-col justify-between">
                            <ShieldCheck size={20} className="text-orange-500 mb-2"/>
                            <div>
                                <span className="text-2xl font-black text-slate-800">{stats.totalRisks}</span>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Risks Found</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Category Performance (Bar Chart Visual) */}
                <div className="col-span-12 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                        <Layers size={20} className="text-blue-500"/> 공종별 안전 퍼포먼스 랭킹
                    </h3>
                    <div className="space-y-4">
                        {stats.categoryData.map((cat, idx) => (
                            <div key={idx} className="flex items-center gap-4 group">
                                {/* [UPDATED] Added truncate to prevent text overflow */}
                                <div className="w-24 font-bold text-sm text-slate-600 text-right shrink-0 truncate" title={cat.category}>{cat.category}</div>
                                <div className="flex-1 h-10 bg-slate-50 rounded-xl overflow-hidden relative border border-slate-100">
                                    <div 
                                        className={`h-full rounded-r-xl transition-all duration-1000 flex items-center justify-end pr-3 ${idx === 0 ? 'bg-indigo-500 text-white' : idx === 1 ? 'bg-indigo-400 text-white' : 'bg-slate-200 text-slate-600'}`}
                                        style={{ width: `${Math.max(cat.avgScore, 10)}%` }}
                                    >
                                        <span className="text-xs font-black">{cat.avgScore}점</span>
                                    </div>
                                </div>
                                <div className="w-16 text-right">
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{cat.count}회</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. AI Insight Report (Full Width) */}
                {aiReport && (
                    <div className="col-span-12 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/10">
                                    <BrainCircuit size={24} className="text-indigo-300"/>
                                </div>
                                <h3 className="text-2xl font-black">AI Executive Insight</h3>
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none font-medium leading-relaxed opacity-90 whitespace-pre-wrap">
                                {aiReport}
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Data Lifecycle Management Card */}
                <div className="col-span-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <HardDrive size={120} className="text-indigo-600"/>
                    </div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-2">
                            <Database size={20} className="text-indigo-600"/> 데이터 자산 관리 (Data Asset Management)
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-xl">
                            분석된 안전 데이터를 <strong>백업(Export)</strong>하여 보관하거나, 기존 데이터셋을 <strong>복구(Import)</strong>하여 연구 모델을 업데이트합니다.
                        </p>
                    </div>
                    <div className="relative z-10 flex gap-3">
                        <button 
                            onClick={() => onBackupData('TBM')} 
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <Download size={18}/> 
                            <span className="text-xs">TBM 데이터 백업</span>
                        </button>
                        <button 
                            onClick={() => onBackupData('ALL')} 
                            className="flex items-center gap-2 px-5 py-3 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
                        >
                            <Download size={18}/> 
                            <span className="text-xs">전체 통합 백업</span>
                        </button>
                        <div className="h-10 w-px bg-slate-200 mx-1"></div>
                        <button 
                            onClick={() => restoreInputRef.current?.click()}
                            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                        >
                            <Upload size={18}/> 
                            <span className="text-xs">데이터 복구 (Import)</span>
                        </button>
                        <input 
                            type="file" 
                            ref={restoreInputRef} 
                            className="hidden" 
                            accept=".json"
                            multiple
                            onChange={handleRestoreClick}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};
