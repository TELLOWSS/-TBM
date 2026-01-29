
import React, { useMemo, useState } from 'react';
import { TBMEntry, TeamOption } from '../types';
import { FileText, Printer, Search, Filter, Calendar, CheckCircle2, AlertCircle, Download, MoreHorizontal, UserCheck, Shield, Loader2, Package, Sparkles, GraduationCap, FileSpreadsheet, BarChart2, PieChart, Activity, Database, BrainCircuit, Microscope, Trash2, CheckSquare, Square, XCircle } from 'lucide-react';
import JSZip from 'jszip';

interface ReportCenterProps {
  entries: TBMEntry[];
  onOpenPrintModal: (targetEntries: TBMEntry[]) => void;
  signatures: { safety: string | null; site: string | null };
  teams: TeamOption[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
}

const SimpleLoadingOverlay = ({ text }: { text: string }) => (
    <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in text-white">
        <Loader2 size={48} className="text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-300 font-bold animate-pulse">{text}</p>
    </div>
);

export const ReportCenter: React.FC<ReportCenterProps> = ({ entries, onOpenPrintModal, signatures, teams, onDelete, onBulkDelete }) => {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedDate, setSelectedDate] = useState(''); // Date Filter
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // Multi-select
  
  const [isZipping, setIsZipping] = useState(false);
  
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
      let result = entries;

      // 1. Team Filter
      if (selectedTeam !== 'all') {
          const targetTeam = uniqueTeams.find(t => t.id === selectedTeam);
          if (targetTeam) {
              result = result.filter(e => (e.teamName || '').trim() === targetTeam.name);
          }
      }

      // 2. Date Filter
      if (selectedDate) {
          result = result.filter(e => e.date === selectedDate);
      }

      return result;
  }, [selectedTeam, selectedDate, entries, uniqueTeams]);

  // --- Handlers ---

  const handlePrintClick = () => {
      if (selectedIds.size > 0) {
          // Print Selected
          const targets = entries.filter(e => selectedIds.has(e.id));
          onOpenPrintModal(targets);
      } else {
          // Print Filtered View
          if (filteredEntries.length === 0) {
              alert("출력할 문서가 없습니다.");
              return;
          }
          if (filteredEntries.length > 50 && !confirm(`${filteredEntries.length}건의 문서를 한 번에 처리하시겠습니까? (시간이 소요될 수 있습니다)`)) {
              return;
          }
          onOpenPrintModal(filteredEntries);
      }
  };

  const handleBulkDeleteClick = () => {
      if (selectedIds.size === 0) return;
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === filteredEntries.length && filteredEntries.length > 0) {
          setSelectedIds(new Set());
      } else {
          const newSet = new Set<string>();
          filteredEntries.forEach(e => newSet.add(e.id));
          setSelectedIds(newSet);
      }
  };

  const handleExportDataPackage = async () => { /* Placeholder for ZIP logic if needed */ };

  return (
    <div className="space-y-6 animate-fade-in pb-24 relative">
      {isZipping && <SimpleLoadingOverlay text="데이터 처리 중..." />}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileText size={24} /></div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">Document Archive</span>
           </div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">안전 문서 통합 관리소</h2>
           <p className="text-slate-500 text-sm font-medium mt-1">
               {selectedIds.size > 0 
                ? <span className="text-indigo-600 font-bold">{selectedIds.size}개 항목이 선택되었습니다.</span> 
                : "법적 보존 연한에 맞춰 TBM 일지를 안전하게 보관하고 관리합니다."}
           </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
           <button onClick={handlePrintClick} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20">
              <Printer size={18} /> 
              {selectedIds.size > 0 ? `선택 항목 (${selectedIds.size}) 출력/PDF` : '현재 목록 출력/PDF'}
           </button>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-20">
         <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
             {/* Date Filter */}
             <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                 <Calendar size={16} className="text-slate-500"/>
                 <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-sm font-bold text-slate-700 outline-none w-32"
                 />
                 {selectedDate && <button onClick={() => setSelectedDate('')} className="text-slate-400 hover:text-red-500"><XCircle size={14}/></button>}
             </div>

             <div className="h-6 w-px bg-slate-200 mx-2"></div>

             {/* Team Filter Buttons */}
             <div className="flex gap-2">
                 <button onClick={() => setSelectedTeam('all')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${selectedTeam === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>전체</button>
                 {uniqueTeams.map(team => (
                    <button key={team.id} onClick={() => setSelectedTeam(team.id)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border whitespace-nowrap ${selectedTeam === team.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{team.name}</button>
                 ))}
             </div>
         </div>

         {/* Selection Actions */}
         <div className="flex items-center gap-3 w-full md:w-auto justify-end">
             <button 
                onClick={toggleSelectAll} 
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
             >
                {selectedIds.size > 0 && selectedIds.size === filteredEntries.length ? <CheckSquare size={16} className="text-indigo-600"/> : <Square size={16}/>}
                전체 선택 ({filteredEntries.length})
             </button>
         </div>
      </div>

      {/* Grid */}
      {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Search size={48} className="mb-4 opacity-20"/>
              <p className="font-bold">조건에 맞는 문서가 없습니다.</p>
              <button onClick={() => { setSelectedDate(''); setSelectedTeam('all'); }} className="mt-4 text-sm text-blue-500 underline">필터 초기화</button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             {filteredEntries.map((entry, idx) => {
                const isSelected = selectedIds.has(entry.id);
                return (
                <div 
                    key={entry.id} 
                    onClick={() => toggleSelection(entry.id)}
                    className={`bg-white rounded-2xl border p-0 overflow-hidden transition-all duration-300 group cursor-pointer relative ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-md transform scale-[1.01]' : 'border-slate-200 hover:shadow-lg hover:-translate-y-1'}`} 
                    style={{ animation: `slideUpFade 0.5s ease-out forwards ${idx * 0.05}s`, opacity: 0 }}
                >
                   {/* Selection Overlay Checkbox */}
                   <div className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                       {isSelected && <CheckSquare size={14} className="text-white"/>}
                   </div>

                   <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 pl-12">
                      <div>
                         <h4 className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{entry.teamName}</h4>
                         <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium"><Calendar size={10} /> {entry.date} {entry.time}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-[10px] font-bold border ${entry.riskFactors && entry.riskFactors.length > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{entry.riskFactors && entry.riskFactors.length > 0 ? '위험 발견' : '양호'}</div>
                   </div>
                   
                   <div className="h-32 bg-slate-100 relative overflow-hidden">
                      {entry.tbmPhotoUrl ? <img src={entry.tbmPhotoUrl} alt="Proof" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-50"><AlertCircle size={20} className="mb-1"/><span>사진 없음</span></div>}
                      {entry.videoAnalysis && (
                          <div className="absolute top-2 right-2 flex gap-1">
                              <span className={`text-[10px] font-black px-2 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-md ${entry.videoAnalysis.score >= 80 ? 'bg-violet-500/90 text-white' : 'bg-orange-500/90 text-white'}`}><Sparkles size={10} className="text-yellow-300" /> AI {entry.videoAnalysis.score}</span>
                          </div>
                      )}
                   </div>
                   
                   <div className="p-3 flex justify-between items-center bg-white text-xs">
                      <div className="flex gap-2 text-slate-500 font-bold">
                         <span className="flex items-center gap-1"><UserCheck size={12}/> {entry.attendeesCount}명</span>
                         <span className="flex items-center gap-1"><AlertCircle size={12}/> {entry.riskFactors?.length || 0}건</span>
                      </div>
                      <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); onOpenPrintModal([entry]); }} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-bold transition-colors">상세</button>
                      </div>
                   </div>
                </div>
             )})}
          </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-slide-up">
              <span className="font-bold text-sm flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400"/>
                  {selectedIds.size}개 선택됨
              </span>
              <div className="h-4 w-px bg-slate-700"></div>
              <div className="flex items-center gap-2">
                  <button onClick={handlePrintClick} className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors text-xs font-bold">
                      <Printer size={16}/> 선택 인쇄
                  </button>
                  <button onClick={handleBulkDeleteClick} className="flex items-center gap-1.5 hover:text-red-400 transition-colors text-xs font-bold ml-4">
                      <Trash2 size={16}/> 일괄 삭제
                  </button>
              </div>
              <button onClick={() => setSelectedIds(new Set())} className="ml-2 bg-slate-800 rounded-full p-1 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                  <XCircle size={16}/>
              </button>
          </div>
      )}
    </div>
  );
};