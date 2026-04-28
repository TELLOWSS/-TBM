
import React, { useState, useMemo, useRef } from 'react';
import { TBMEntry, TeamOption } from '../types';
import { BarChart2, TrendingUp, BrainCircuit, Activity, Database, Info, Hexagon, Radar, ShieldCheck, Upload, HardDrive, Search, AlertTriangle, Users, Zap, Layers, FileText, Download, Share2, Target, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { generateGeneralInsight } from '../services/geminiService';

interface SafetyDataLabProps {
    entries: TBMEntry[];
    teams: TeamOption[];
    onBackupData: (scope: 'ALL' | 'TBM' | 'RISK') => void;
    onRestoreData: (files: FileList) => void;
}

// --- [Visual Component] Neon Donut Chart ---
const NeonDonutChart = ({ score, size = 160 }: { score: number, size?: number }) => {
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    
    let color = "#10B981"; // Emerald
    if (score < 70) color = "#EF4444"; // Red
    else if (score < 85) color = "#F59E0B"; // Amber

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                <circle cx={size/2} cy={size/2} r={radius} stroke="#334155" strokeWidth={strokeWidth} fill="none" />
                <circle 
                    cx={size/2} cy={size/2} r={radius} 
                    stroke={color} strokeWidth={strokeWidth} fill="none"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <span className="text-4xl font-black tracking-tighter" style={{ color }}>{score}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Safety Score</span>
            </div>
        </div>
    );
};

// --- [Visual Component] Risk Spectrum Bar ---
interface RiskSpectrumBarProps {
    label: string;
    count: number;
    max: number;
    color: string;
    onClick: () => void;
    isActive: boolean;
    isDimmed: boolean;
}
const RiskSpectrumBar: React.FC<RiskSpectrumBarProps> = ({ label, count, max, color, onClick, isActive, isDimmed }) => {
    const width = Math.max((count / max) * 100, 5); // Min 5% width
    return (
        <div 
            onClick={onClick}
            className={`flex items-center gap-3 mb-3 group cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-30 blur-[1px]' : 'opacity-100'}`}
        >
            <div className={`w-16 text-right text-xs font-bold transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{label}</div>
            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden relative">
                <div 
                    className={`h-full rounded-full ${color} transition-all duration-1000 relative group-hover:brightness-125 ${isActive ? 'ring-2 ring-white brightness-125' : ''}`} 
                    style={{ width: `${width}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50"></div>
                </div>
            </div>
            <div className="w-8 text-xs font-mono text-white font-bold text-right">{count}</div>
        </div>
    );
};

// --- [Visual Component] Team Heatmap Cell ---
interface TeamHeatmapCellProps {
    name: string;
    activity: number;
    score: number;
    maxActivity: number;
    onClick: () => void;
    isActive: boolean;
    isDimmed: boolean;
}
const TeamHeatmapCell: React.FC<TeamHeatmapCellProps> = ({ name, activity, score, maxActivity, onClick, isActive, isDimmed }) => {
    const intensity = Math.min(Math.max((activity / maxActivity), 0.2), 1);
    
    return (
        <div 
            onClick={onClick}
            className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group cursor-pointer
                ${isActive ? 'scale-105 z-10 ring-2 ring-white shadow-2xl' : 'hover:scale-105 hover:z-10'}
                ${isDimmed ? 'opacity-30 blur-[1px] scale-95' : 'opacity-100'}
            `}
            style={{ 
                backgroundColor: activity > 0 ? `rgba(79, 70, 229, ${intensity * 0.4})` : '#1e293b',
                borderColor: activity > 0 ? `rgba(99, 102, 241, ${intensity})` : '#334155'
            }}
        >
            <div className="flex justify-between items-start">
                <span className={`text-xs font-bold truncate ${activity > 0 ? 'text-white' : 'text-slate-500'}`}>{name}</span>
                {activity > 0 && (
                    <span className={`text-[9px] font-mono px-1.5 rounded ${score >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {score}
                    </span>
                )}
            </div>
            <div className="mt-2">
                <div className="text-xl font-black text-white">{activity}</div>
                <div className="text-[9px] text-slate-400">Activities</div>
            </div>
            {activity === 0 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-[10px] text-slate-500 font-bold">No Data</span></div>}
        </div>
    );
};

export const SafetyDataLab: React.FC<SafetyDataLabProps> = ({ entries, teams, onBackupData, onRestoreData }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [filter, setFilter] = useState<{ type: 'TEAM' | 'RISK' | 'NONE', value: string }>({ type: 'NONE', value: '' });
    const restoreInputRef = useRef<HTMLInputElement>(null);
    // [FIX] 컴포넌트 언마운트 후 setState 방지
    const mountedRef = useRef(true);
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

    // --- 1. Global Analysis (Always calculated from FULL dataset) ---
    // Needed to display the "Menu" (Full list of teams, full list of risks) even when filtered
    const globalAnalysis = useMemo(() => {
        // Team Stats for Heatmap
        const teamStats = teams.map(team => {
            const teamEntries = entries.filter(e => e.teamId === team.id);
            const count = teamEntries.length;
            const scoreSum = teamEntries.reduce((acc, e) => acc + (e.videoAnalysis?.score || 0), 0);
            const score = count > 0 ? Math.round(scoreSum / count) : 0;
            return { id: team.id, name: team.name, count, score };
        }).sort((a, b) => b.count - a.count);
        const maxTeamActivity = Math.max(...teamStats.map(t => t.count), 1);

        // Risk Stats for Spectrum
        const riskKeywords = ["추락", "낙하", "전도", "협착", "붕괴", "감전", "화재", "충돌", "질식", "절단", "비계", "장비"];
        const riskCounts: Record<string, number> = {};
        riskKeywords.forEach(k => riskCounts[k] = 0);
        
        entries.forEach(e => {
            if (e.riskFactors) {
                e.riskFactors.forEach(r => {
                    const text = (r.risk + " " + r.measure).replace(/\s/g, "");
                    riskKeywords.forEach(k => {
                        if (text.includes(k)) riskCounts[k]++;
                    });
                });
            }
        });
        const riskSpectrum = Object.entries(riskCounts)
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 7);
        const maxRiskCount = Math.max(...riskSpectrum.map(r => r.count), 1);

        return { teamStats, maxTeamActivity, riskSpectrum, maxRiskCount };
    }, [entries, teams]);

    // --- 2. Filtered Analysis (Calculated based on Selection) ---
    // Used for Score, Trends, and specific details
    const filteredAnalysis = useMemo(() => {
        let filteredEntries = entries;

        if (filter.type === 'TEAM') {
            filteredEntries = entries.filter(e => e.teamId === filter.value);
        } else if (filter.type === 'RISK') {
            filteredEntries = entries.filter(e => {
                if (!e.riskFactors) return false;
                return e.riskFactors.some(r => (r.risk + r.measure).includes(filter.value));
            });
        }

        const totalEntries = filteredEntries.length;
        const totalPeople = filteredEntries.reduce((acc, e) => acc + (e.attendeesCount || 0), 0);
        
        const validScores = filteredEntries.filter(e => e.videoAnalysis?.score).map(e => e.videoAnalysis!.score);
        const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;

        // Trend Data
        const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().slice(0, 10);
        });
        const trendData = last7Days.map(date => {
            const dayEntries = filteredEntries.filter(e => e.date === date);
            const count = dayEntries.length;
            const scoreSum = dayEntries.reduce((acc, e) => acc + (e.videoAnalysis?.score || 0), 0);
            const avg = count > 0 ? Math.round(scoreSum / count) : 0;
            return { date: date.slice(5), count, avg };
        });

        return { totalEntries, totalPeople, avgScore, trendData };
    }, [entries, filter]);

    // --- AI Insight Logic ---
    const generateDeepInsight = async () => {
        setIsAnalyzing(true);
        try {
            const topRisk = globalAnalysis.riskSpectrum.length > 0 ? globalAnalysis.riskSpectrum[0].label : "없음";
            const context = filter.type === 'TEAM' 
                ? `Focus: Specific Team (${teams.find(t=>t.id===filter.value)?.name})` 
                : filter.type === 'RISK' 
                ? `Focus: Specific Risk (${filter.value})` 
                : "Focus: Overall Site";

            const prompt = `
                Role: Senior Safety Data Analyst for a Construction Site.
                Context: ${context}
                Input Data:
                - Avg Safety Score: ${filteredAnalysis.avgScore}/100
                - Total Activities: ${filteredAnalysis.totalEntries}
                - Most Frequent Risk (Global): ${topRisk}
                
                Task:
                Write a "Commander's Briefing" (Korean) in markdown.
                1. 🚨 **Critical Alert**: Analysis of current status.
                2. 📈 **Trend Analysis**: Interpret the data pattern.
                3. 🛡️ **Action Order**: Give 3 specific orders to team leaders.
                
                Tone: Professional, direct, authoritative.
            `;
            const result = await generateGeneralInsight(prompt);
            if (mountedRef.current) setAiReport(result);
        } catch (e) {
            if (mountedRef.current) alert("AI 분석 실패");
        } finally {
            if (mountedRef.current) setIsAnalyzing(false);
        }
    };

    const handleRestoreClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onRestoreData(e.target.files);
            e.target.value = '';
        }
    };

    const handleResetFilter = () => {
        setFilter({ type: 'NONE', value: '' });
        setAiReport(null);
    };

    return (
        <div className="bg-[#0F172A] min-h-screen p-4 md:p-8 animate-fade-in pb-24 font-sans text-slate-100 overflow-x-hidden selection:bg-indigo-500 selection:text-white">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-indigo-400 mb-2 animate-pulse">
                        <Activity size={20} />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Safety Control Tower</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-2">
                        안전 데이터 <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">심층 연구소</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">
                        현장의 모든 리스크를 데이터로 시각화하여 사고를 선제적으로 예방합니다.
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    {filter.type !== 'NONE' && (
                        <div className="flex items-center gap-2 bg-indigo-900/50 border border-indigo-500 text-indigo-200 px-4 py-2 rounded-xl animate-fade-in">
                            <Filter size={14} />
                            <span className="text-xs font-bold">
                                {filter.type === 'TEAM' ? teams.find(t=>t.id===filter.value)?.name : filter.value} 필터 적용중
                            </span>
                            <button onClick={handleResetFilter} className="ml-2 hover:text-white transition-colors"><XCircle size={16}/></button>
                        </div>
                    )}
                    <button 
                        onClick={generateDeepInsight}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 border border-indigo-500"
                    >
                        {isAnalyzing ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : <BrainCircuit size={18} />}
                        <span>AI 전략 분석</span>
                    </button>
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 1. Score & KPI Card */}
                <div className="col-span-12 md:col-span-4 bg-slate-800/50 rounded-3xl p-6 border border-slate-700 shadow-xl backdrop-blur-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
                    
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Target size={16} className="text-emerald-400"/> Current Status
                        </h3>
                        <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-[10px] font-bold text-emerald-400 animate-pulse">
                            LIVE
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center flex-1">
                        <NeonDonutChart score={filteredAnalysis.avgScore} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50 transition-colors hover:border-indigo-500/50">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Activites</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-white">{filteredAnalysis.totalEntries}</span>
                                <span className="text-xs text-slate-500">건</span>
                            </div>
                        </div>
                        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50 transition-colors hover:border-indigo-500/50">
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Workers</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-white">{filteredAnalysis.totalPeople}</span>
                                <span className="text-xs text-slate-500">명</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Risk Spectrum (Bar Chart) - Filter Trigger */}
                <div className="col-span-12 md:col-span-4 bg-slate-800/50 rounded-3xl p-6 border border-slate-700 shadow-xl backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-400"/> Risk Spectrum
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono">Top 7 Factors</span>
                    </div>
                    <div className="space-y-1">
                        {globalAnalysis.riskSpectrum.map((risk, idx) => (
                            <RiskSpectrumBar 
                                key={risk.label} 
                                label={risk.label} 
                                count={risk.count} 
                                max={globalAnalysis.maxRiskCount}
                                color={idx === 0 ? 'bg-red-500' : idx < 3 ? 'bg-amber-500' : 'bg-blue-500'} 
                                onClick={() => setFilter(prev => prev.type === 'RISK' && prev.value === risk.label ? { type: 'NONE', value: '' } : { type: 'RISK', value: risk.label })}
                                isActive={filter.type === 'RISK' && filter.value === risk.label}
                                isDimmed={filter.type === 'RISK' && filter.value !== risk.label}
                            />
                        ))}
                        {globalAnalysis.riskSpectrum.length === 0 && (
                            <div className="h-40 flex items-center justify-center text-slate-600 text-xs">
                                데이터 수집 중...
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Trend Combo Chart */}
                <div className="col-span-12 md:col-span-4 bg-slate-800/50 rounded-3xl p-6 border border-slate-700 shadow-xl backdrop-blur-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp size={16} className="text-cyan-400"/> 7-Day Trend
                        </h3>
                        {filter.type !== 'NONE' && <span className="text-[9px] text-indigo-400 font-bold">필터 적용됨</span>}
                    </div>
                    
                    <div className="flex-1 flex items-end justify-between gap-2 h-full min-h-[200px] relative">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                            <div className="w-full h-px bg-slate-500"></div>
                            <div className="w-full h-px bg-slate-500"></div>
                            <div className="w-full h-px bg-slate-500"></div>
                            <div className="w-full h-px bg-slate-500"></div>
                        </div>

                        {filteredAnalysis.trendData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group relative z-10 h-full">
                                {/* Line Chart Simulation (Dot) */}
                                <div 
                                    className="w-2 h-2 rounded-full bg-cyan-400 absolute transition-all duration-500 shadow-[0_0_10px_#22d3ee]"
                                    style={{ bottom: `${d.avg}%`, marginBottom: '4px' }}
                                ></div>
                                
                                {/* Bar Chart */}
                                <div 
                                    className="w-full bg-slate-700/50 rounded-t-sm transition-all duration-500 group-hover:bg-slate-600 relative"
                                    style={{ height: `${Math.min((d.count / 10) * 100, 100)}%` }} // Scale count
                                >
                                    {d.count > 0 && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            {d.count}건
                                        </div>
                                    )}
                                </div>
                                <span className="text-[9px] font-mono text-slate-500">{d.date}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex gap-4 justify-center text-[10px] font-bold">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-slate-600 rounded"></div><span>참여 팀 수</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_5px_#22d3ee]"></div><span>안전 점수</span></div>
                    </div>
                </div>

                {/* 4. Team Activity Heatmap - Filter Trigger */}
                <div className="col-span-12 bg-slate-800/30 rounded-3xl p-6 border border-slate-700/50 shadow-xl">
                    <div className="flex items-center gap-2 mb-6">
                        <Layers size={18} className="text-violet-400"/>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Team Activity Heatmap (Drill-Down)</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {globalAnalysis.teamStats.map((team) => (
                            <TeamHeatmapCell 
                                key={team.id}
                                name={team.name} 
                                activity={team.count} 
                                score={team.score}
                                maxActivity={globalAnalysis.maxTeamActivity}
                                onClick={() => setFilter(prev => prev.type === 'TEAM' && prev.value === team.id ? { type: 'NONE', value: '' } : { type: 'TEAM', value: team.id })}
                                isActive={filter.type === 'TEAM' && filter.value === team.id}
                                isDimmed={filter.type === 'TEAM' && filter.value !== team.id}
                            />
                        ))}
                    </div>
                </div>

                {/* 5. AI Report Terminal */}
                {aiReport && (
                    <div className="col-span-12 bg-black rounded-3xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden font-mono text-sm leading-relaxed text-slate-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        <div className="flex items-center gap-2 mb-4 text-green-400">
                            <span className="animate-pulse">●</span>
                            <span className="font-bold">AI_COMMAND_TERMINAL</span>
                        </div>
                        <div className="whitespace-pre-wrap">{aiReport}</div>
                    </div>
                )}

                {/* 6. Data Management Strip */}
                <div className="col-span-12 flex flex-col md:flex-row gap-4 bg-slate-800/80 p-6 rounded-3xl border border-slate-700 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-700 rounded-xl text-slate-400">
                            <Database size={24}/>
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">데이터 자산 관리</h4>
                            <p className="text-xs text-slate-400">안전 데이터를 백업하거나 복구하여 자산화합니다.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => onBackupData('ALL')} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-slate-600">
                            <Download size={14}/> 전체 백업
                        </button>
                        <button onClick={() => restoreInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-900/50">
                            <Upload size={14}/> 데이터 복구
                        </button>
                        <input type="file" ref={restoreInputRef} className="hidden" accept=".json" multiple onChange={handleRestoreClick} />
                    </div>
                </div>

            </div>
        </div>
    );
};
