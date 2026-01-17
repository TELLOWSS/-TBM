import React, { useState, useMemo, useRef } from 'react';
import { TBMEntry, TeamCategory, TeamOption, TBMAnalysisResult } from '../types';
import { BarChart2, PieChart, Users, TrendingUp, BrainCircuit, Activity, Layers, Target, Download, Share2, FileText, Sparkles, Microscope, Database, Info, FileBox, Hexagon, Radar, ShieldCheck, Upload, HardDrive, Search } from 'lucide-react';
import { generateGeneralInsight } from '../services/geminiService';

interface SafetyDataLabProps {
    entries: TBMEntry[];
    teams: TeamOption[];
    onBackupData: (scope: 'ALL' | 'TBM' | 'RISK') => void; // [NEW]
    onRestoreData: (files: FileList) => void; // [NEW]
}

type Tab = 'OVERALL' | 'CATEGORY' | 'TEAM';

// --- [Premium Component] High-Fidelity Radar Chart ---
const PremiumRadarChart = ({ data }: { data: number[] }) => {
    // 5 Metrics
    const size = 320;
    const center = size / 2;
    const radius = 90;
    const labels = ["일지 품질", "작업 집중도", "전파 명확성", "보호구 착용", "참여 적극성"];
    
    // Helper
    const getCoords = (value: number, index: number, total: number, offset = 0) => {
        const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
        const r = ((value / 100) * radius) + offset;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Concentric Circles (Webs) instead of polygons for modern look
    const circles = [0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => (
        <circle 
            key={i} 
            cx={center} 
            cy={center} 
            r={radius * scale} 
            fill="none" 
            stroke="#E2E8F0" 
            strokeWidth={i === 4 ? 1.5 : 1}
            strokeDasharray={i < 4 ? "4 4" : "0"} 
        />
    ));

    const axes = labels.map((_, idx) => {
        const { x, y } = getCoords(100, idx, labels.length);
        return (
            <React.Fragment key={idx}>
                <line x1={center} y1={center} x2={x} y2={y} stroke="#E2E8F0" strokeWidth="1" />
                {/* Axis Dots */}
                <circle cx={x} cy={y} r="2" fill="#94A3B8" />
            </React.Fragment>
        );
    });

    const dataPoints = data.map((val, idx) => {
        const { x, y } = getCoords(val, idx, labels.length);
        return `${x},${y}`;
    }).join(" ");

    const labelEls = labels.map((label, idx) => {
        const { x, y } = getCoords(100, idx, labels.length, 30);
        return (
            <text key={idx} x={x} y={y} fontSize="11" fontWeight="bold" textAnchor="middle" dominantBaseline="middle" fill="#475569" className="uppercase tracking-tight">
                {label}
            </text>
        );
    });

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            <defs>
                <linearGradient id="radarGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1"/>
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            {circles}
            {axes}
            
            {/* Data Area with Glow */}
            <polygon points={dataPoints} fill="url(#radarGradient)" stroke="#6366F1" strokeWidth="2.5" filter="url(#glow)" />
            
            {/* Data Points */}
            {data.map((val, idx) => {
                const { x, y } = getCoords(val, idx, labels.length);
                return (
                    <g key={idx} className="group">
                        <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#6366F1" strokeWidth="2.5" className="cursor-pointer transition-all duration-300 group-hover:r-7"/>
                        <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill="#6366F1" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            {val}
                        </text>
                    </g>
                );
            })}
            {labelEls}
        </svg>
    );
};

// --- [Premium Component] Smooth Bézier Trend Chart ---
const PremiumTrendChart = ({ data }: { data: number[] }) => {
    const width = 300;
    const height = 120;
    const padding = 10;
    
    if (data.length < 2) return (
        <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            데이터 수집 중... (최소 2건 필요)
        </div>
    );

    const max = 100;
    const min = 0;
    
    // Map points
    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - min) / (max - min)) * (height - padding * 2) - padding;
        return {x, y};
    });

    // Generate Bezier Path
    const pathD = points.reduce((acc, point, i, arr) => {
        if (i === 0) return `M ${point.x},${point.y}`;
        
        // Control points for simple smoothing (Catmull-Rom logic simplified)
        const prev = arr[i - 1];
        const cp1x = prev.x + (point.x - prev.x) * 0.5;
        const cp1y = prev.y;
        const cp2x = prev.x + (point.x - prev.x) * 0.5;
        const cp2y = point.y;
        
        return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
    }, "");

    const lastPoint = points[points.length - 1];
    const fillPath = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
                <linearGradient id="trendGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                </linearGradient>
                <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
                </pattern>
            </defs>
            
            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#grid)" opacity="0.6"/>

            {/* Area Fill */}
            <path d={fillPath} fill="url(#trendGradient)" stroke="none" />
            
            {/* Curve Line */}
            <path d={pathD} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            
            {/* Points */}
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2} fill="#ffffff" stroke="#10B981" strokeWidth="2" className={i === points.length - 1 ? "animate-pulse" : ""} />
            ))}
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

        // --- Team Specific Deep Dive Data ---
        const teamSpecificStats = teams.map(team => {
            const teamEntries = entries.filter(e => e.teamId === team.id);
            if (teamEntries.length === 0) return null;

            let tSumLog=0, tSumFocus=0, tSumVoice=0, tSumPPE=0, tScoreSum=0;
            let tCount = 0;

            teamEntries.forEach(e => {
                if(e.videoAnalysis?.rubric) {
                    tSumLog += (e.videoAnalysis.rubric.logQuality || 0) / 30 * 100;
                    tSumFocus += (e.videoAnalysis.rubric.focus || 0) / 30 * 100;
                    tSumVoice += (e.videoAnalysis.rubric.voice || 0) / 20 * 100;
                    tSumPPE += (e.videoAnalysis.rubric.ppe || 0) / 20 * 100;
                    tScoreSum += e.videoAnalysis.score;
                    tCount++;
                }
            });

            const tAvgScore = tCount > 0 ? Math.round(tScoreSum / tCount) : 0;
            const tRadarData = tCount > 0 
                ? [Math.round(tSumLog/tCount), Math.round(tSumFocus/tCount), Math.round(tSumVoice/tCount), Math.round(tSumPPE/tCount), 85]
                : [0,0,0,0,0];

            return {
                id: team.id,
                name: team.name,
                category: team.category,
                count: tCount,
                avgScore: tAvgScore,
                radarData: tRadarData
            };
        }).filter(Boolean); // Filter out teams with no data

        return { 
            totalEntries, totalRisks, avgScore, 
            grade, gradeColor, gradeBg,
            radarData, trendData, categoryData,
            teamSpecificStats
        };
    }, [entries, teams]);

    // --- AI Insight Generation ---
    const generateDeepInsight = async () => {
        setIsAnalyzing(true);
        try {
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

            const resultText = await generateGeneralInsight(prompt);
            setAiReport(resultText);
        } catch (error: any) {
            console.error(error);
            const msg = error.message || '';
            alert(msg.includes('429') || msg.includes('Quota') || msg.includes('제한') ? msg : "AI 분석 중 오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRestoreClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onRestoreData(e.target.files);
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
                        {/* [REPLACED] Premium Chart */}
                        <PremiumRadarChart data={stats.radarData} />
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
                            {/* [REPLACED] Premium Chart */}
                            <PremiumTrendChart data={stats.trendData} />
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

                {/* [NEW] Team Deep Dive Section */}
                <div className="col-span-12">
                    <div className="flex items-center gap-2 mb-4 mt-2 px-2">
                        <Search size={20} className="text-indigo-600"/>
                        <h3 className="text-xl font-black text-slate-800">팀별 심층 분석 (Deep Dive)</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {(stats.teamSpecificStats as any[]).map((team: any, idx: number) => (
                            <div key={team.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-indigo-300 transition-all flex flex-col group relative overflow-hidden h-[340px]">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm truncate w-32" title={team.name}>{team.name}</h4>
                                        <p className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">{team.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-2xl font-black text-indigo-600">{team.avgScore}</span>
                                        <span className="text-[10px] text-slate-400 font-bold">AVG Score</span>
                                    </div>
                                </div>

                                {/* Radar Chart Mini */}
                                <div className="flex-1 flex items-center justify-center relative z-10">
                                    <div className="w-48 h-48">
                                        <PremiumRadarChart data={team.radarData} />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center relative z-10">
                                    <span className="text-[10px] font-bold text-slate-400">Total Activity</span>
                                    <span className="text-xs font-black text-slate-700 bg-slate-50 px-2 py-1 rounded">{team.count}회</span>
                                </div>

                                {/* Background Decoration */}
                                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>
                            </div>
                        ))}
                        {(stats.teamSpecificStats as any[]).length === 0 && (
                            <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                                <Database size={32} className="opacity-20 mb-2"/>
                                <span className="text-xs font-bold">분석할 팀 데이터가 충분하지 않습니다.</span>
                            </div>
                        )}
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