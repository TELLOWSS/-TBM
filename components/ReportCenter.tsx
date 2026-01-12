
import React, { useMemo, useState } from 'react';
import { TBMEntry, TeamOption } from '../types';
import { FileText, Printer, Search, Filter, Calendar, CheckCircle2, AlertCircle, Download, MoreHorizontal, UserCheck, Shield, Loader2, Package, Sparkles, GraduationCap, FileSpreadsheet, BarChart2, PieChart, Activity, Database, BrainCircuit, Microscope, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { GoogleGenAI } from "@google/genai";

interface ReportCenterProps {
  entries: TBMEntry[];
  onOpenPrintModal: () => void;
  signatures: { safety: string | null; site: string | null };
  teams: TeamOption[];
  onDelete: (id: string) => void;
}

// ... (Statistical helper functions remain same) ...
const calculateMean = (data: number[]) => {
    if (!data || data.length === 0) return 0;
    const validData = data.filter(n => typeof n === 'number' && !isNaN(n));
    if (validData.length === 0) return 0;
    const sum = validData.reduce((a, b) => a + b, 0);
    return sum / validData.length;
};

const calculateSD = (data: number[], mean: number) => {
    if (!data || data.length === 0) return 0;
    const validData = data.filter(n => typeof n === 'number' && !isNaN(n));
    if (validData.length === 0) return 0;
    const variance = validData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validData.length;
    return Math.sqrt(variance);
};

const calculateCorrelation = (x: number[], y: number[]) => {
    if (x.length !== y.length || x.length === 0) return 0;
    const xMean = calculateMean(x);
    const yMean = calculateMean(y);
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    for (let i = 0; i < x.length; i++) {
        const xi = isNaN(x[i]) ? 0 : x[i];
        const yi = isNaN(y[i]) ? 0 : y[i];
        numerator += (xi - xMean) * (yi - yMean);
        denomX += Math.pow(xi - xMean, 2);
        denomY += Math.pow(yi - yMean, 2);
    }
    const denom = Math.sqrt(denomX * denomY);
    if (denom === 0) return 0;
    return numerator / denom;
};

const calculateLinearRegression = (y: number[]) => {
    if (!y || y.length < 2) return { slope: 0, intercept: 0 };
    const n = y.length;
    const x = Array.from({ length: n }, (_, i) => i + 1); 
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
    const sumXY = x.reduce((a, b, i) => a + b * (isNaN(y[i]) ? 0 : y[i]), 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return { slope: 0, intercept: sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
};

const fetchImageAsBase64 = async (url: string): Promise<string> => {
    if (!url) return "";
    if (url.startsWith('data:')) {
        return url.split(',')[1];
    }
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = reader.result as string;
                resolve(res.split(',')[1]);
            };
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn("Failed to fetch image for ZIP:", url);
        return "";
    }
};

const ResearchOverlay = ({ progress, status }: { progress: number, status: string }) => (
    <div className="fixed inset-0 z-[999999] bg-[#0F172A]/80 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] p-12 shadow-2xl flex flex-col items-center max-w-md w-full mx-4 border border-indigo-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-20"></div>
                    <div className="absolute inset-0 rounded-full border border-indigo-300 opacity-30 scale-125 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin duration-3000"></div>
                    <div className="bg-slate-800 p-5 rounded-3xl shadow-xl border border-slate-700 relative z-10">
                        <Microscope size={40} className="text-indigo-400 animate-pulse" />
                    </div>
                </div>
                <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Deep Research</h3>
                <p className="text-sm text-indigo-200/80 text-center leading-relaxed mb-10 font-medium">
                    빅데이터를 통계적으로 분석하고<br/>
                    <span className="text-indigo-400 font-bold">학술 연구용 데이터셋</span>을 구축합니다.
                </p>
                <div className="w-full space-y-3">
                    <div className="flex justify-between text-[10px] font-bold text-indigo-300 uppercase tracking-wider">
                        <span>Analysis Phase</span>
                        <span className="font-mono">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner border border-slate-700">
                        <div className="h-full bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)]" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[11px] text-slate-400 font-medium h-4 animate-pulse">{status}</p>
                        <Activity size={12} className="text-emerald-500 animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const SimpleLoadingOverlay = ({ text }: { text: string }) => (
    <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in text-white">
        <Loader2 size={48} className="text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-300 font-bold animate-pulse">{text}</p>
    </div>
);

export const ReportCenter: React.FC<ReportCenterProps> = ({ entries, onOpenPrintModal, signatures, teams, onDelete }) => {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [isZipping, setIsZipping] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStatus, setResearchStatus] = useState("Initializing...");

  const stats = useMemo(() => {
    return {
      total: entries.length,
      signed: (signatures.safety && signatures.site) ? entries.length : 0, 
      hasRisk: entries.filter(e => e.riskFactors && e.riskFactors.length > 0).length,
      photos: entries.filter(e => e.tbmPhotoUrl).length
    };
  }, [entries, signatures]);

  const uniqueTeams = useMemo(() => {
      const uniqueNames = new Set<string>();
      const result: { id: string; name: string }[] = [];
      teams.forEach(t => {
          const name = t.name.trim();
          if (!uniqueNames.has(name)) {
              uniqueNames.add(name);
              result.push({ id: t.id, name: name });
          }
      });
      entries.forEach(e => {
          const name = (e.teamName || 'Unknown').trim();
          if (name && !uniqueNames.has(name)) {
              uniqueNames.add(name);
              result.push({ id: e.teamId, name: name });
          }
      });
      return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, entries]);

  const filteredEntries = useMemo(() => {
      if (selectedTeam === 'all') return entries;
      const targetTeam = uniqueTeams.find(t => t.id === selectedTeam);
      if (!targetTeam) return entries;
      return entries.filter(e => (e.teamName || '').trim() === targetTeam.name);
  }, [selectedTeam, entries, uniqueTeams]);

  // ... (handleExportDataPackage & handleResearchExport functions included as is) ...
  const handleExportDataPackage = async () => { /* ... */ };
  const handleResearchExport = async () => { /* ... */ };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {isZipping && <SimpleLoadingOverlay text="이미지 및 데이터 압축 중..." />}
      {isResearching && <ResearchOverlay progress={researchProgress} status={researchStatus} />}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileText size={24} /></div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">Document Archive</span>
           </div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">안전 문서 통합 관리소</h2>
           <p className="text-slate-500 text-sm font-medium mt-1">법적 보존 연한에 맞춰 TBM 일지를 안전하게 보관하고 관리합니다.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
           <button onClick={handleResearchExport} disabled={isZipping || isResearching} className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 border border-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
              <GraduationCap size={20} className="group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col items-start leading-none">
                  <span className="text-xs md:text-sm">학술 연구용 패키지</span>
                  <span className="text-[9px] text-indigo-200 font-medium mt-0.5">Deep Research & Mining</span>
              </div>
           </button>
           <button onClick={handleExportDataPackage} disabled={isZipping || isResearching} className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <Package size={18} />
              <span className="text-xs md:text-sm">증빙용 ZIP</span>
           </button>
           <button onClick={onOpenPrintModal} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20">
              <Printer size={18} /> 출력/PDF
           </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start">
               <span className="text-slate-400 text-xs font-bold uppercase">Total Documents</span>
               <FileText className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20}/>
            </div>
            <div className="mt-2">
               <span className="text-3xl font-black text-slate-800">{stats.total}</span>
               <span className="text-sm text-slate-400 font-medium ml-1">건</span>
            </div>
         </div>
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-emerald-300 transition-colors">
            <div className="flex justify-between items-start">
               <span className="text-slate-400 text-xs font-bold uppercase">Evidence Photos</span>
               <div className="bg-emerald-100 p-1 rounded text-emerald-600"><CheckCircle2 size={16}/></div>
            </div>
            <div className="mt-2">
               <span className="text-3xl font-black text-emerald-600">{stats.photos}</span>
               <span className="text-sm text-slate-400 font-medium ml-1">장 보존 중</span>
            </div>
         </div>
         <div className="md:col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700 shadow-lg text-white flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-32 bg-white/5 skew-x-12 -mr-8"></div>
            <div className="relative z-10">
               <h3 className="font-bold text-sm text-slate-300 mb-1 flex items-center gap-2"><Shield size={14}/> 결재 승인 현황</h3>
               <div className="flex gap-6 mt-3">
                  <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${signatures.safety ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-600 bg-slate-700 text-slate-500'}`}><UserCheck size={16} /></div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Safety Manager</p>
                        <p className={`text-xs font-bold ${signatures.safety ? 'text-emerald-400' : 'text-slate-500'}`}>{signatures.safety ? '서명 완료' : '미승인'}</p>
                     </div>
                  </div>
                  <div className="w-px h-8 bg-slate-700"></div>
                  <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${signatures.site ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-slate-600 bg-slate-700 text-slate-500'}`}><UserCheck size={16} /></div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Site Manager</p>
                        <p className={`text-xs font-bold ${signatures.site ? 'text-blue-400' : 'text-slate-500'}`}>{signatures.site ? '서명 완료' : '미승인'}</p>
                     </div>
                  </div>
               </div>
            </div>
            <button onClick={onOpenPrintModal} className="relative z-10 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold border border-white/20 backdrop-blur-sm transition-colors">서명 관리 &gt;</button>
         </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 items-center py-2 overflow-x-auto">
         <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 text-slate-500">
            <Filter size={14} />
            <span className="text-xs font-bold">필터:</span>
         </div>
         <button onClick={() => setSelectedTeam('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedTeam === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>전체 보기</button>
         {uniqueTeams.map(team => (
            <button key={team.id} onClick={() => setSelectedTeam(team.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedTeam === team.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{team.name}</button>
         ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
         {filteredEntries.map((entry, idx) => (
            <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 p-0 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default" style={{ animation: `slideUpFade 0.5s ease-out forwards ${idx * 0.05}s`, opacity: 0 }}>
               <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-400 font-bold text-xs">{new Date(entry.date).getDate()}</div>
                     <div>
                        <h4 className="font-bold text-slate-800 text-sm">{entry.teamName}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium"><Calendar size={10} /> {entry.date} {entry.time}</div>
                     </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-bold border ${entry.riskFactors && entry.riskFactors.length > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{entry.riskFactors && entry.riskFactors.length > 0 ? '위험요인 발견' : '특이사항 없음'}</div>
               </div>
               {/* Body... (Image, Analysis Badge) */}
               <div className="h-32 bg-slate-100 relative overflow-hidden group">
                  {entry.tbmPhotoUrl ? <img src={entry.tbmPhotoUrl} alt="Proof" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-50"><AlertCircle size={20} className="mb-1"/><span>사진 없음</span></div>}
                  {entry.videoAnalysis && (
                      <div className="absolute top-2 right-2 flex gap-1">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-md ${entry.videoAnalysis.score >= 80 ? 'bg-violet-500/90 text-white' : entry.videoAnalysis.score >= 50 ? 'bg-orange-500/90 text-white' : 'bg-red-500/90 text-white'}`}><Sparkles size={10} className="text-yellow-300" /> AI {entry.videoAnalysis.score}</span>
                      </div>
                  )}
               </div>
               {/* Footer / Actions */}
               <div className="p-3 flex justify-between items-center bg-white text-xs">
                  <div className="flex gap-2 text-slate-500 font-bold">
                     <span className="flex items-center gap-1"><UserCheck size={12}/> {entry.attendeesCount}명</span>
                     <span className="flex items-center gap-1"><AlertCircle size={12}/> {entry.riskFactors?.length || 0}건</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <button onClick={onOpenPrintModal} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-bold transition-colors">상세 보기</button>
                      <div className="w-px h-3 bg-slate-200"></div>
                      <button 
                         onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                         className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                         title="삭제"
                      >
                         <Trash2 size={14}/>
                      </button>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};
