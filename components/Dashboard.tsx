
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TBMEntry } from '../types';
import { Calendar, Users, AlertCircle, FileText, Camera, BarChart2, CheckCircle2, TrendingUp, ChevronRight, Edit2, ShieldAlert, BookOpen, Quote, Database, Trash2, X, ScanLine, Server, Lock, Sparkles, BrainCircuit, MessageSquare, ArrowRight, ShieldCheck, Activity, Zap, Clock, MoreHorizontal, Plus, Eye, Mic, HandMetal, UserCheck, PlayCircle, Globe, Languages, Target, Radar, Presentation, TrendingDown, CalendarRange, FolderInput, FileStack, Layers, ArrowUpDown, Filter, Printer } from 'lucide-react';

interface DashboardProps {
  entries: TBMEntry[];
  onViewReport: () => void;
  onNavigateToReports: () => void;
  onNewEntry: (mode: 'BATCH' | 'ROUTINE') => void; 
  onEdit: (entry: TBMEntry) => void;
  onOpenSettings: () => void;
  onDelete: (id: string) => void; 
  onPrintSingle: (entry: TBMEntry) => void; // [NEW] Handler for single PDF print
}

// ... (ImpactReportModal and analysis logic remain the same) ...
interface ImpactReportModalProps {
   entries: TBMEntry[];
   onClose: () => void;
}

type AnalysisPeriod = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';

const ImpactReportModal: React.FC<ImpactReportModalProps> = ({ entries, onClose }) => {
   const [period, setPeriod] = useState<AnalysisPeriod>('WEEK');

   // Calculate Statistics
   const analysis = useMemo(() => {
       const now = new Date();
       const todayStr = now.toISOString().split('T')[0];
       let cutoffDate = new Date();
       if (period === 'WEEK') cutoffDate.setDate(now.getDate() - 7);
       else if (period === 'MONTH') cutoffDate.setDate(now.getDate() - 30);
       else if (period === 'QUARTER') cutoffDate.setDate(now.getDate() - 90);
       else if (period === 'YEAR') cutoffDate.setDate(now.getDate() - 365);
       
       const cutoffStr = cutoffDate.toISOString().split('T')[0];
       const filteredEntries = entries.filter(e => e.date >= cutoffStr && e.date <= todayStr);
       const totalTBM = filteredEntries.length;
       const aiAnalyzed = filteredEntries.filter(e => e.videoAnalysis).length;
       
       if (totalTBM === 0) return null;

       const avgScore = aiAnalyzed > 0 
           ? Math.round(filteredEntries.reduce((acc, e) => acc + (e.videoAnalysis?.score || 0), 0) / aiAnalyzed) 
           : 0;
       const totalRisks = filteredEntries.reduce((acc, e) => acc + (e.riskFactors?.length || 0), 0);
       const avgRisksPerTBM = (totalRisks / Math.max(totalTBM, 1)).toFixed(1);
       const entriesWithBlindSpots = filteredEntries.filter(e => e.videoAnalysis?.insight?.missingTopics?.length ?? 0 > 0).length;
       const blindSpotRate = aiAnalyzed > 0 ? Math.round((entriesWithBlindSpots / aiAnalyzed) * 100) : 0;
       const avgFocus = aiAnalyzed > 0
           ? Math.round(filteredEntries.reduce((acc, e) => acc + (e.videoAnalysis?.focusAnalysis?.overall || 0), 0) / aiAnalyzed) 
           : 0;

       return { avgScore, totalRisks, avgRisksPerTBM, blindSpotRate, avgFocus, totalTBM };
   }, [entries, period]);

   return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
         <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#0F172A] text-white p-6 md:p-10 relative overflow-hidden shrink-0">
               {/* Abstract Art Background */}
               <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
               
               <button onClick={onClose} className="absolute top-4 right-4 md:top-8 md:right-8 text-white/50 hover:text-white z-50 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
               
               <div className="relative z-10">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-6">
                       <div>
                           <div className="flex items-center gap-2 mb-3">
                               <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase backdrop-blur-md">Safety Impact Report</span>
                           </div>
                           <h2 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">안전 성과 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">데이터 시각화</span></h2>
                           <p className="text-slate-400 text-sm font-medium mt-3 max-w-2xl leading-relaxed">
                               TBM 활동이 현장의 안전 수준을 어떻게 변화시키고 있는지 정량적 데이터로 증명합니다.
                           </p>
                       </div>
                       
                       <div className="flex bg-slate-800/50 p-1.5 rounded-xl backdrop-blur-md border border-slate-700/50 overflow-x-auto w-full md:w-auto">
                           {(['WEEK', 'MONTH', 'QUARTER', 'YEAR'] as AnalysisPeriod[]).map((p) => (
                               <button key={p} onClick={() => setPeriod(p)} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${period === p ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                   {p === 'WEEK' ? '주간' : p === 'MONTH' ? '월간' : p === 'QUARTER' ? '분기' : '연간'}
                               </button>
                           ))}
                       </div>
                   </div>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 custom-scrollbar">
                {!analysis ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                        <Database size={48} className="mb-4 opacity-20"/>
                        <p className="font-bold">선택한 기간에 데이터가 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                        {/* Score Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center text-violet-600 border border-violet-100 group-hover:scale-110 transition-transform">
                                    <Sparkles size={24}/>
                                </div>
                                <span className={`text-xs font-black px-2 py-1 rounded-lg ${analysis.avgScore >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{analysis.avgScore >= 80 ? 'EXCELLENT' : 'GOOD'}</span>
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-1">{analysis.avgScore}점</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Avg. TBM Quality Score</p>
                            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                                AI가 분석한 TBM 품질 점수입니다. 명확한 발음, 상호작용, 보호구 착용 상태를 종합 평가했습니다.
                            </div>
                        </div>

                        {/* Risk Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 group-hover:scale-110 transition-transform">
                                    <ShieldAlert size={24}/>
                                </div>
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-1">{analysis.totalRisks}건</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Identified Risks</p>
                            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                                TBM 과정에서 사전에 발굴하고 조치한 위험 요인의 총 개수입니다. (평균 {analysis.avgRisksPerTBM}건/회)
                            </div>
                        </div>

                        {/* Focus Card */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:shadow-xl transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
                                    <Users size={24}/>
                                </div>
                                <span className="text-xs font-black px-2 py-1 rounded-lg bg-blue-50 text-blue-600">{analysis.avgFocus}% Focus</span>
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 mb-1">{analysis.avgFocus}%</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Worker Engagement</p>
                            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                                근로자들의 시선 및 자세를 분석하여 산출한 평균 집중도입니다. 안전 문화 정착의 지표입니다.
                            </div>
                        </div>
                    </div>
                )}
            </div>
         </div>
      </div>,
      document.body
   );
};

export const Dashboard: React.FC<DashboardProps> = ({ entries, onViewReport, onNavigateToReports, onNewEntry, onEdit, onOpenSettings, onDelete, onPrintSingle }) => {
  const [showImpactReport, setShowImpactReport] = useState(false); 
  const [chartSortBy, setChartSortBy] = useState<'COUNT' | 'SCORE'>('COUNT');

  const today = new Date().toISOString().split('T')[0];
  const todaysEntries = entries.filter(e => e.date === today);

  // ... (Culture Score logic remains the same) ...
  const cultureScore = useMemo(() => {
      if (entries.length === 0) return 0;
      const scores = entries.filter(e => e.videoAnalysis).map(e => e.videoAnalysis!.score);
      if (scores.length === 0) return 0;
      const currentAvg = scores.slice(0, 5).reduce((a,b)=>a+b,0) / Math.min(5, scores.length);
      return Math.round(currentAvg);
  }, [entries]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    const stats: Record<string, { name: string; count: number; totalAttendees: number; aiScores: number[] }> = {};

    entries.forEach(entry => {
      if (entry.date && entry.date >= oneWeekAgoStr) {
        const teamName = entry.teamName || '미지정 팀';
        if (!stats[teamName]) stats[teamName] = { name: teamName, count: 0, totalAttendees: 0, aiScores: [] };
        stats[teamName].count += 1;
        stats[teamName].totalAttendees += (entry.attendeesCount || 0);
        if (entry.videoAnalysis?.score) stats[teamName].aiScores.push(entry.videoAnalysis.score);
      }
    });

    return Object.values(stats)
      .map(item => ({ 
         ...item, 
         avgScore: item.aiScores.length > 0 ? Math.round(item.aiScores.reduce((a,b)=>a+b,0) / item.aiScores.length) : null
      }))
      .sort((a, b) => chartSortBy === 'COUNT' ? b.count - a.count : (b.avgScore || 0) - (a.avgScore || 0));
  }, [entries, chartSortBy]);

  const calculatedMax = Math.max(...weeklyStats.map(s => chartSortBy === 'COUNT' ? s.count : (s.avgScore || 0)), 0);
  const maxValue = Math.max(calculatedMax, 5); 

  const StatCard = ({ title, value, unit, icon, colorClass, delay }: any) => {
    return (
        <div className={`relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl transition-all duration-300 group animate-slide-up ${delay}`}>
          <div className={`absolute -right-4 -top-4 p-4 opacity-[0.08] transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 ${colorClass}`}>
             {React.cloneElement(icon, { size: 100 })}
          </div>
          <div className="relative z-10">
             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${colorClass.replace('text-', 'bg-').replace('600', '50').replace('500', '50')} ${colorClass}`}>
                {React.cloneElement(icon, { size: 20 })}
             </div>
             <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
                    <span className="text-sm font-bold text-slate-400">{unit}</span>
                </div>
             </div>
          </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      {showImpactReport && <ImpactReportModal entries={entries} onClose={() => setShowImpactReport(false)} />}

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
         {/* Card 1: Batch Processing (Manager) */}
         <button onClick={() => onNewEntry('BATCH')} className="relative lg:col-span-2 bg-[#1E293B] rounded-[32px] p-6 md:p-8 text-left shadow-2xl hover:scale-[1.01] transition-all group overflow-hidden border border-slate-700 min-h-[240px] md:h-[320px] flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-900/20 opacity-50"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-blue-500/30 transition-all"></div>
            
            <div className="relative z-10 flex justify-between items-start w-full">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-indigo-300">
                    <FileStack size={24} className="md:w-8 md:h-8" />
                </div>
                <span className="text-[10px] font-black text-indigo-300 bg-indigo-950/50 border border-indigo-500/30 px-3 py-1.5 rounded-full uppercase tracking-widest">For Manager</span>
            </div>

            <div className="relative z-10">
                <h3 className="text-2xl md:text-4xl font-black text-white mb-3 leading-tight tracking-tight">종합 일지 <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-300">일괄 자동 처리</span></h3>
                <p className="text-xs md:text-sm text-indigo-200/80 font-medium max-w-md leading-relaxed hidden md:block">
                    "일일안전종합일지" 파일 하나만 업로드하세요.<br/>
                    AI가 모든 팀의 데이터를 자동으로 분리하고 분석하여 등록합니다.
                </p>
            </div>
            
            <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-white mt-4 group-hover:translate-x-2 transition-transform">
                <span>Start Batch Process</span> <ArrowRight size={14}/>
            </div>
         </button>

         {/* Card 2: Individual Entry (Leader) */}
         <button onClick={() => onNewEntry('ROUTINE')} className="relative bg-white rounded-[32px] p-6 md:p-8 text-left shadow-xl hover:scale-[1.01] transition-all group overflow-hidden border border-slate-100 min-h-[240px] md:h-[320px] flex flex-col justify-between">
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
            
            <div className="relative z-10 flex justify-between items-start w-full">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-emerald-600">
                    <Camera size={24} className="md:w-8 md:h-8" />
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-widest">For Team Leader</span>
            </div>

            <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 leading-tight tracking-tight">개별 TBM <br/>간편 등록</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed hidden md:block">
                    팀장님이 직접 스마트폰으로<br/>활동 사진과 영상을 촬영하여 등록합니다.
                </p>
            </div>

            <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-emerald-700 mt-4 group-hover:translate-x-2 transition-transform">
                <span>Start Entry</span> <ArrowRight size={14}/>
            </div>
         </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
         <StatCard title="오늘의 TBM" value={todaysEntries.length} unit="팀" icon={<Calendar />} colorClass="text-blue-600" delay="delay-100"/>
         <div className="relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl transition-all duration-300 group animate-slide-up delay-200">
             <div className="absolute -right-4 -top-4 p-4 opacity-[0.08] transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 text-violet-600">
                 <TrendingUp size={100}/>
             </div>
             <div className="relative z-10">
                 <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 bg-violet-50 text-violet-600">
                     <Target size={20}/>
                 </div>
                 <div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Safety Culture Index</p>
                     <div className="flex items-baseline gap-1">
                         <h3 className="text-3xl font-black text-slate-800 tracking-tight">{cultureScore}</h3>
                         <span className="text-sm font-bold text-slate-400">점</span>
                     </div>
                     <p className="text-[10px] text-green-500 font-bold mt-1 flex items-center gap-1">
                         <TrendingUp size={10}/> 점진적 상향 중
                     </p>
                 </div>
             </div>
         </div>
         <StatCard title="발견된 위험요인" value={todaysEntries.reduce((acc, curr) => acc + (curr.riskFactors?.length || 0), 0)} unit="건" icon={<AlertCircle />} colorClass="text-orange-500" delay="delay-300"/>
         
         <div onClick={onNavigateToReports} className="rounded-3xl p-6 cursor-pointer relative overflow-hidden group shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 animate-slide-up delay-400 bg-slate-900 min-h-[140px]">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] translate-x-10 -translate-y-10 group-hover:scale-125 transition-transform duration-700"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
               <div className="flex justify-between items-start">
                   <div className="bg-white/10 p-3 rounded-2xl text-white backdrop-blur-md border border-white/10"><FileText size={20} /></div>
                   <div className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-white backdrop-blur-md border border-white/5">Archive</div>
               </div>
               <div>
                   <h3 className="text-white font-black text-xl mb-1 tracking-tight">보고서 센터</h3>
                   <p className="text-slate-400 text-xs font-medium">전체 기록 열람 및 PDF 출력</p>
               </div>
            </div>
         </div>
      </div>

      {/* Charts & List Section */}
      <div className="grid lg:grid-cols-3 gap-6">
         {/* Left: Weekly Chart */}
         <div className="lg:col-span-2 bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col animate-slide-up delay-200 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 relative z-10 gap-4">
               <div>
                  <h3 className="font-black text-xl text-slate-800 tracking-tight">주간 활동 요약</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wide">Weekly Performance</p>
               </div>
               <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 w-full md:w-auto">
                   <button onClick={() => setChartSortBy('COUNT')} className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${chartSortBy === 'COUNT' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><Activity size={12}/> 참여율순</button>
                   <button onClick={() => setChartSortBy('SCORE')} className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${chartSortBy === 'SCORE' ? 'bg-white shadow text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}><Sparkles size={12}/> AI점수순</button>
               </div>
            </div>

            <div className="relative flex-1 group min-h-[260px] flex items-end">
                {/* Chart Area */}
                <div className="w-full h-full flex items-end gap-2 md:gap-4 overflow-x-auto pb-2 custom-scrollbar px-2">
                   {weeklyStats.length === 0 ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                         <BarChart2 size={48} className="mb-2 opacity-20"/>
                         <span className="text-sm font-bold">데이터 수집 중...</span>
                      </div>
                   ) : (
                      weeklyStats.map((stat, idx) => {
                         const value = chartSortBy === 'COUNT' ? stat.count : (stat.avgScore || 0);
                         const maxVal = chartSortBy === 'COUNT' ? maxValue : 100;
                         const heightPercent = Math.max(15, (value / maxVal) * 100);
                         
                         let barGradient = "from-slate-200 to-slate-300";
                         let textColor = "text-slate-400";
                         if (chartSortBy === 'SCORE') {
                             if ((stat.avgScore || 0) >= 80) { barGradient = "from-violet-400 to-indigo-500"; textColor = "text-violet-600"; }
                             else if ((stat.avgScore || 0) >= 50) { barGradient = "from-orange-300 to-amber-400"; textColor = "text-orange-600"; }
                             else { barGradient = "from-red-300 to-rose-400"; textColor = "text-red-500"; }
                         } else {
                             barGradient = "from-blue-300 to-blue-500";
                             if (idx < 3) { barGradient = "from-blue-500 to-indigo-600"; textColor = "text-blue-700"; }
                         }

                         return (
                            <div key={idx} className="flex flex-col items-center group/bar relative h-full justify-end w-12 md:w-14 shrink-0">
                               {/* Tooltip */}
                               <div className="mb-3 opacity-0 group-hover/bar:opacity-100 transition-all transform translate-y-2 group-hover/bar:translate-y-0 absolute bottom-full z-20 pointer-events-none">
                                  <div className="bg-slate-800 text-white text-[10px] font-bold px-3 py-2 rounded-xl shadow-xl whitespace-nowrap flex flex-col items-center gap-0.5">
                                     <span>{stat.name}</span>
                                     <span className="text-slate-300">{stat.count}회 / AI {stat.avgScore || 0}점</span>
                                  </div>
                                  <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1"></div>
                               </div>
                               
                               <div className={`w-full rounded-2xl bg-gradient-to-t ${barGradient} transition-all duration-500 relative shadow-lg group-hover/bar:shadow-xl group-hover/bar:scale-105`} style={{ height: `${heightPercent}%` }}></div>
                               <div className="mt-3 text-center w-full"><p className={`text-[10px] font-bold ${textColor} transition-colors truncate w-full`}>{stat.name.split(' ')[0]}</p></div>
                            </div>
                         )
                      })
                   )}
                </div>
            </div>
         </div>

         {/* Right: Recent Feed */}
         <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden h-[500px] lg:h-auto animate-slide-up delay-300 flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-50 bg-white sticky top-0 z-10">
               <div className="flex justify-between items-center mb-1">
                   <h3 className="font-black text-xl text-slate-800 tracking-tight">실시간 현황</h3>
                   <button onClick={onOpenSettings} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><Database size={18} className="text-slate-400"/></button>
               </div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Live Feed</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
               {entries.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60"><Camera size={48} strokeWidth={1.5} className="mb-3"/><span className="text-sm font-bold">등록된 활동이 없습니다.</span></div>
               ) : (
                  entries.slice(0, 10).map((entry, idx) => (
                     <div key={entry.id || idx} className="group relative bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300 cursor-default">
                        <div className="flex items-start gap-4">
                           <div className="relative z-10 w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shrink-0 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                              {entry.riskFactors?.length ? <AlertCircle size={18} className="text-orange-500" /> : <CheckCircle2 size={18} />}
                           </div>
                           <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex justify-between items-center mb-1">
                                 <h4 className="font-bold text-sm text-slate-800 truncate pr-2">{entry.teamName}</h4>
                                 <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">{entry.time}</span>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-1 mb-2 font-medium">{entry.workDescription || '내용 없음'}</p>
                              
                              <div className="flex gap-2">
                                  {entry.videoAnalysis && (
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 ${entry.videoAnalysis.score >= 80 ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                          <Sparkles size={10}/> {entry.videoAnalysis.score}
                                      </span>
                                  )}
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                      <Users size={12}/> {entry.attendeesCount}
                                  </div>
                              </div>
                           </div>
                           
                           {/* Hover Actions - Now includes Print PDF */}
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 duration-200 bg-white/80 backdrop-blur rounded-xl p-1 shadow-sm border border-slate-100">
                              <button 
                                onClick={(e) => { e.stopPropagation(); onPrintSingle(entry); }} 
                                className="p-2 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-lg transition-colors"
                                title="PDF 보고서 보기"
                              >
                                <Printer size={14}/>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Edit2 size={14}/></button>
                              <button onClick={(e) => { e.stopPropagation(); onDelete(String(entry.id)); }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={14}/></button>
                           </div>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
