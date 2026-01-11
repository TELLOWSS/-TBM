
import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
// [FIX] Lazy Load heavy components to prevent white screen on init
const TBMForm = React.lazy(() => import('./components/TBMForm').then(module => ({ default: module.TBMForm })));
const ReportView = React.lazy(() => import('./components/ReportView').then(module => ({ default: module.ReportView })));
const ReportCenter = React.lazy(() => import('./components/ReportCenter').then(module => ({ default: module.ReportCenter })));
const RiskAssessmentManager = React.lazy(() => import('./components/RiskAssessmentManager').then(module => ({ default: module.RiskAssessmentManager })));
const SafetyDataLab = React.lazy(() => import('./components/SafetyDataLab').then(module => ({ default: module.SafetyDataLab }))); // [NEW]

import { HistoryModal } from './components/HistoryModal';
import { TBMEntry, MonthlyRiskAssessment, TeamOption, TeamCategory } from './types';
import { TEAMS } from './constants';
import { StorageDB } from './utils/storageDB';
import { Download, Upload, Trash2, X, Settings, Database, Eraser, Plus, Users, Edit3, Save, FileText, ScanLine, Camera, Lock, Server, MessageSquare, BrainCircuit, ShieldCheck, PlayCircle, Sparkles, Target, Eye, Radar, Hexagon, Layers, Zap, FileStack, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

// ... (SystemIdentityModal, FeatureShowcase, DeleteConfirmModal, ModeSelectionModal remain unchanged) ...
// --- System Identity Modal (Design Philosophy) ---
const SystemIdentityModal = ({ onClose }: { onClose: () => void }) => {
    return createPortal(
        <div className="fixed inset-0 z-[999999] bg-[#0F172A] text-white animate-fade-in flex items-center justify-center p-4 md:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[50vh] h-[50vh] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none"></div>
            
            <div className="max-w-4xl w-full relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar" onClick={e => e.stopPropagation()}>
                {/* Header with Logo */}
                <div className="flex items-start justify-between mb-10">
                    <div className="flex items-center gap-5">
                        <div className="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center shrink-0">
                             <div className="absolute inset-0 bg-blue-600 rounded-2xl rotate-6 opacity-30 animate-pulse"></div>
                             <div className="absolute inset-0 bg-indigo-600 rounded-2xl -rotate-6 opacity-30"></div>
                             <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl border border-slate-600">
                                <Hexagon size={24} strokeWidth={2} className="text-white md:w-8 md:h-8"/>
                                <div className="absolute w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full top-2 right-2 md:top-3 md:right-3 border-2 border-slate-800 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                             </div>
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-1">HUIGANG OS</h1>
                            <p className="text-[10px] md:text-sm font-bold text-slate-400 tracking-[0.4em] uppercase">Smart Safety System v3.0.0</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pb-10">
                    {/* Left Column: Logo Anatomy */}
                    <div>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Target size={14}/> Symbol Identity
                        </h3>
                        <div className="space-y-6">
                            <div className="group">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg">
                                        <Hexagon size={20} />
                                    </div>
                                    <h4 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors">The Hexagon Structure</h4>
                                </div>
                                <p className="text-xs text-slate-400 pl-14 leading-relaxed">
                                    <strong>완벽한 구조적 안정성.</strong> 자연계에서 가장 견고한 육각형 구조는 어떠한 상황에서도 무너지지 않는 '휘강건설의 무사고 원칙'을 상징합니다.
                                </p>
                            </div>

                            <div className="group">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-lg">
                                        <Layers size={20} />
                                    </div>
                                    <h4 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">Dual Orbit Layers</h4>
                                </div>
                                <p className="text-xs text-slate-400 pl-14 leading-relaxed">
                                    <strong>기술과 현장의 융합.</strong> 배경의 교차된 레이어는 '물리적 건설 현장(Concrete)'과 '디지털 AI 기술(Code)'이 빈틈없이 결합되어 있음을 의미합니다.
                                </p>
                            </div>

                            <div className="group">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform shadow-lg">
                                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_8px_currentColor]"></div>
                                    </div>
                                    <h4 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">Critical Alert Node</h4>
                                </div>
                                <p className="text-xs text-slate-400 pl-14 leading-relaxed">
                                    <strong>초정밀 위험 감지.</strong> 우측 상단의 붉은 포인트는 아주 미세한 위험 신호(Blind Spot)조차 놓치지 않고 즉시 감지하여 알리는 시스템의 '눈'입니다.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Column: UI Philosophy */}
                    <div className="bg-gradient-to-br from-white/5 to-transparent rounded-3xl p-8 border border-white/10 backdrop-blur-md flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">UI Philosophy</h3>
                            <h2 className="text-3xl font-black mb-4 leading-tight">Digital Concrete<br/>& Transparent Glass</h2>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium mb-6">
                                건설의 본질인 <strong>콘크리트의 물성(Texture)</strong>과<br/>
                                안전 관리의 <strong>투명성(Clarity)</strong>을 시각화했습니다.<br/>
                                화려함보다는 정보의 <strong>명확한 전달과 신뢰</strong>를 최우선으로 설계된 Architectural UI입니다.
                            </p>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Primary Palette</p>
                                    <div className="flex gap-2">
                                        <div className="w-8 h-8 rounded bg-[#0F172A] border border-white/20 shadow-lg" title="Midnight Steel"></div>
                                        <div className="w-8 h-8 rounded bg-[#3B82F6] shadow-lg shadow-blue-900/50" title="Safety Blue"></div>
                                        <div className="w-8 h-8 rounded bg-[#F1F5F9] border border-slate-400 shadow-lg" title="Concrete White"></div>
                                        <div className="w-8 h-8 rounded bg-[#EF4444] shadow-lg shadow-red-900/50" title="Alert Red"></div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 font-bold">Constructed by</p>
                                    <p className="text-xs text-white font-bold mt-0.5">Safety Division</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const FeatureShowcase: React.FC<{featureKey: any, onClose: () => void}> = ({ featureKey, onClose }) => {
    return null; 
};

const DeleteConfirmModal = ({ info, onConfirm, onCancel }: { info: any, onConfirm: () => void, onCancel: () => void }) => {
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-slate-200">
        <div className="bg-red-50 p-6 flex flex-col items-center text-center border-b border-red-100">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
            <Trash2 size={24} className="text-red-600" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-1">삭제 확인</h3>
          <p className="text-sm text-slate-500 font-bold">이 항목을 영구적으로 삭제하시겠습니까?</p>
        </div>
        <div className="p-6 bg-slate-50 space-y-3">
           <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                 <span className="text-slate-500 font-bold">팀명</span>
                 <span className="text-slate-800 font-bold">{info.teamName}</span>
              </div>
              <div className="flex justify-between">
                 <span className="text-slate-500 font-bold">ID</span>
                 <span className="text-slate-400 font-mono text-xs">{String(info.id).substring(0, 15)}...</span>
              </div>
           </div>
           <p className="text-xs text-red-500 font-bold text-center">⚠ 삭제 후에는 복구할 수 없습니다.</p>
        </div>
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100">취소</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200">삭제 확정</button>
        </div>
      </div>
    </div>, document.body
  );
};

const ModeSelectionModal = ({ onSelect, onClose }: { onSelect: (mode: 'BATCH' | 'ROUTINE') => void, onClose: () => void }) => {
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up relative p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div><h2 className="text-2xl font-black text-slate-800">작업 모드 선택</h2></div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24}/></button>
                </div>
                <div className="space-y-4">
                    <button onClick={() => onSelect('BATCH')} className="w-full flex items-center p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 group text-left relative">
                        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl mr-4 shrink-0 group-hover:scale-110 transition-transform"><FileStack size={28} /></div>
                        <div className="flex-1 z-10"><h3 className="font-bold text-lg text-slate-800">종합일지 일괄 자동 처리</h3><p className="text-xs text-slate-500 mt-1">관리자용. 종합 일지 파일을 업로드하여<br/>여러 팀의 데이터를 한 번에 추출합니다.</p></div>
                    </button>
                    <button onClick={() => onSelect('ROUTINE')} className="w-full flex items-center p-5 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 group text-left relative">
                        <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl mr-4 shrink-0 group-hover:scale-110 transition-transform"><Camera size={28} /></div>
                        <div className="flex-1 z-10"><h3 className="font-bold text-lg text-slate-800">개별 TBM 간편 등록</h3><p className="text-xs text-slate-500 mt-1">현장 팀장용. 사진과 영상을 촬영하여<br/>단일 팀의 활동 내역을 등록합니다.</p></div>
                    </button>
                </div>
            </div>
        </div>, document.body
    );
};

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-bold">시스템 리소스 로딩 중...</p>
    </div>
);

// --- HELPER: Team Deduplication Logic ---
const deduplicateTeams = (teams: TeamOption[]): TeamOption[] => {
    const uniqueMap = new Map<string, TeamOption>();
    teams.forEach(t => {
        const normalizedName = t.name.trim().replace(/\s+/g, ' '); // Normalize spaces
        if (!uniqueMap.has(normalizedName)) {
            uniqueMap.set(normalizedName, t);
        }
    });
    return Array.from(uniqueMap.values());
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true); 
  const [entries, setEntries] = useState<TBMEntry[]>([]);
  const [reportTargetEntries, setReportTargetEntries] = useState<TBMEntry[]>([]);
  const [monthlyAssessments, setMonthlyAssessments] = useState<MonthlyRiskAssessment[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [signatures, setSignatures] = useState<{safety: string | null, site: string | null}>({ safety: null, site: null });
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [editingEntry, setEditingEntry] = useState<TBMEntry | null>(null); 
  const [entryMode, setEntryMode] = useState<'BATCH' | 'ROUTINE'>('ROUTINE');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false); 
  const [settingsTab, setSettingsTab] = useState<'backup' | 'teams'>('teams'); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFeature, setActiveFeature] = useState<any>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCategory, setNewTeamCategory] = useState<TeamCategory>(TeamCategory.FORMWORK);
  const [deleteState, setDeleteState] = useState<{isOpen: boolean, targetId: string | null, targetInfo: any | null}>({ isOpen: false, targetId: null, targetInfo: null });

  const currentMonthGuidelines = useMemo(() => {
    if (monthlyAssessments.length === 0) return [];
    return [...monthlyAssessments].sort((a, b) => b.month.localeCompare(a.month))[0].priorities;
  }, [monthlyAssessments]);

  useEffect(() => {
    const initData = async () => {
        try {
            let loadedEntries = await StorageDB.get<TBMEntry[]>('tbm_entries');
            if (Array.isArray(loadedEntries)) setEntries(loadedEntries);
            
            // [FIX] Duplicate Team Clean-up on Load
            let loadedTeams = await StorageDB.get<TeamOption[]>('site_teams');
            if (loadedTeams) {
                const cleanTeams = deduplicateTeams(loadedTeams);
                // If duplicates found, update DB immediately
                if (cleanTeams.length !== loadedTeams.length) {
                    await StorageDB.set('site_teams', cleanTeams);
                }
                setTeams(cleanTeams);
            } else {
                setTeams(TEAMS);
            }

            let loadedMonthly = await StorageDB.get<MonthlyRiskAssessment[]>('monthly_assessment_list');
            setMonthlyAssessments(loadedMonthly || []);
            let loadedSigs = await StorageDB.get<{safety: string | null, site: string | null}>('signatures');
            setSignatures(loadedSigs || { safety: null, site: null });
        } catch (error) { console.error("Init failed:", error); } finally { setIsLoading(false); }
    };
    initData();
  }, []);

  const handleAddTeam = () => {
    if(!newTeamName.trim()) return;
    const nameToCheck = newTeamName.trim().replace(/\s+/g, ' ');
    // Check duplication
    if (teams.some(t => t.name.trim().replace(/\s+/g, ' ') === nameToCheck)) {
        alert("이미 존재하는 팀 이름입니다.");
        return;
    }

    const newTeam: TeamOption = { id: `team-${Date.now()}`, name: newTeamName.trim(), category: newTeamCategory };
    const updatedTeams = [...teams, newTeam];
    setTeams(updatedTeams); StorageDB.set('site_teams', updatedTeams); setNewTeamName(''); alert('팀이 추가되었습니다.');
  };

  const handleDeleteTeam = (id: string) => {
    if(confirm("이 팀을 목록에서 제거하시겠습니까?")) {
        const updatedTeams = teams.filter(t => t.id !== id);
        setTeams(updatedTeams); StorageDB.set('site_teams', updatedTeams);
    }
  };

  const handleSaveEntry = (data: TBMEntry | TBMEntry[], shouldExit: boolean = true): boolean => {
    try {
        const newItems = Array.isArray(data) ? data : [data];
        const currentEntries = [...entries];
        newItems.forEach(newItem => {
            const index = currentEntries.findIndex(e => String(e.id) === String(newItem.id));
            if (index >= 0) currentEntries[index] = newItem;
            else currentEntries.unshift(newItem);
        });
        setEntries(currentEntries); setEditingEntry(null); 
        StorageDB.set('tbm_entries', currentEntries);
        if (shouldExit) setCurrentView('dashboard');
        return true; 
    } catch (error: any) { return false; }
  };
  
  const handleEditEntry = (entry: TBMEntry) => { setEditingEntry(entry); setShowReportModal(false); setEntryMode('ROUTINE'); setCurrentView('new'); };
  const handleRequestDelete = (rawId: string | number) => {
    const targetId = String(rawId);
    const targetEntry = entries.find(e => String(e.id) === targetId);
    if (!targetEntry) { window.location.reload(); return; }
    setDeleteState({ isOpen: true, targetId: targetId, targetInfo: targetEntry });
  };
  const handleConfirmDelete = () => {
     const { targetId } = deleteState;
     if (!targetId) return;
     const newEntries = entries.filter(e => String(e.id) !== targetId);
     setEntries(newEntries); StorageDB.set('tbm_entries', newEntries);
     if (editingEntry && String(editingEntry.id) === targetId) { setEditingEntry(null); setCurrentView('dashboard'); }
     setDeleteState({ isOpen: false, targetId: null, targetInfo: null });
  };
  const handleUpdateAssessments = (newAssessments: MonthlyRiskAssessment[]) => { setMonthlyAssessments(newAssessments); StorageDB.set('monthly_assessment_list', newAssessments); };
  const handleUpdateSignature = (role: 'safety' | 'site', dataUrl: string) => { const newSignatures = { ...signatures, [role]: dataUrl }; setSignatures(newSignatures); StorageDB.set('signatures', newSignatures); };
  const handleExportData = () => {
      const data = { tbm_entries: entries, monthly_assessment_list: monthlyAssessments, signatures, site_teams: teams, meta: { date: new Date() } };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'SAPA_BACKUP.json'; a.click();
  };

  // [FIXED] Smart Import Function with Overwrite Option & Team Deduplication
  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const fileList: File[] = Array.from(files); 
      if (fileInputRef.current) fileInputRef.current.value = '';

      // [CRITICAL] User Choice: Merge or Replace
      // Ask user whether to merge or replace existing data
      let mode: 'MERGE' | 'REPLACE' = 'MERGE';
      if (entries.length > 0 || monthlyAssessments.length > 0) {
          const userChoice = confirm(
              `선택한 파일로 데이터를 복구합니다.\n\n` +
              `[확인] = 기존 데이터와 합치기 (Merge)\n` +
              `[취소] = 기존 데이터를 지우고 덮어쓰기 (Overwrite)\n\n` +
              `※ 꼬인 데이터를 정리하려면 [취소]를 눌러 덮어쓰세요.`
          );
          mode = userChoice ? 'MERGE' : 'REPLACE';
      }

      setIsLoading(true);
      try {
          // Initialize base data based on mode
          let mergedEntries = mode === 'REPLACE' ? [] : [...entries];
          let mergedAssessments = mode === 'REPLACE' ? [] : [...monthlyAssessments];
          let mergedTeams = mode === 'REPLACE' ? [] : [...teams];
          let newSignatures = mode === 'REPLACE' ? { safety: null, site: null } : { ...signatures };
          
          let importStats = { tbm: 0, risk: 0, teams: 0, failed: 0 };

          for (const file of fileList) {
              if (file.name.endsWith('.zip') || file.type.includes('zip')) {
                  alert(`⚠️ 주의: '${file.name}'은 연구소용 데이터 패키지(ZIP)입니다.\n시스템 복구에는 '.json' 백업 파일만 사용할 수 있습니다.`);
                  importStats.failed++;
                  continue;
              }

              const text = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target?.result as string);
                  reader.onerror = (e) => reject(e);
                  reader.readAsText(file);
              });
              
              try {
                  const data = JSON.parse(text);
                  
                  // Helper to merge distinct items
                  const mergeItems = (current: any[], incoming: any[]) => {
                      const map = new Map(current.map(i => [String(i.id), i]));
                      incoming.forEach(i => {
                          if (i.id) map.set(String(i.id), i);
                      });
                      return Array.from(map.values());
                  };

                  if (Array.isArray(data)) {
                      if (data.length > 0) {
                          const sample = data[0];
                          if (sample.month && Array.isArray(sample.priorities)) {
                              mergedAssessments = mergeItems(mergedAssessments, data);
                              importStats.risk += data.length;
                          } 
                          else if (sample.date && (sample.teamName || sample.teamId)) {
                              mergedEntries = mergeItems(mergedEntries, data);
                              importStats.tbm += data.length;
                          }
                      }
                  } 
                  else {
                      if (data.tbm_entries && Array.isArray(data.tbm_entries)) {
                          mergedEntries = mergeItems(mergedEntries, data.tbm_entries);
                          importStats.tbm += data.tbm_entries.length;
                      }
                      if (data.monthly_assessment_list && Array.isArray(data.monthly_assessment_list)) {
                          mergedAssessments = mergeItems(mergedAssessments, data.monthly_assessment_list);
                          importStats.risk += data.monthly_assessment_list.length;
                      }
                      if (data.site_teams && Array.isArray(data.site_teams)) {
                          // [FIX] Deduplicate teams when merging
                          const combined = [...mergedTeams, ...data.site_teams];
                          mergedTeams = deduplicateTeams(combined);
                          importStats.teams += data.site_teams.length;
                      }
                      if (data.signatures) {
                          newSignatures = { ...newSignatures, ...data.signatures };
                      }
                  }

              } catch (parseError) {
                  console.error(`Error parsing file ${file.name}:`, parseError);
                  alert(`'${file.name}' 파일이 손상되었거나 올바른 JSON 형식이 아닙니다.`);
                  importStats.failed++;
              }
          }

          // Sort entries
          mergedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          // Commit to State & DB
          setEntries(mergedEntries);
          setMonthlyAssessments(mergedAssessments);
          setTeams(mergedTeams);
          setSignatures(newSignatures);

          await StorageDB.set('tbm_entries', mergedEntries);
          await StorageDB.set('monthly_assessment_list', mergedAssessments);
          await StorageDB.set('site_teams', mergedTeams);
          await StorageDB.set('signatures', newSignatures);

          alert(`✅ 데이터 복구 완료 (${mode === 'REPLACE' ? '덮어쓰기' : '병합'})!\n\n- TBM 일지: ${importStats.tbm}건\n- 위험성평가: ${importStats.risk}건\n- 팀 정보: ${importStats.teams}건\n(실패: ${importStats.failed}건)`);
          setIsSettingsOpen(false);

      } catch (error) {
          console.error("Recovery failed:", error);
          alert("시스템 오류로 복구에 실패했습니다.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleCleanupData = () => { if (confirm('오류 데이터 정리?')) { const valid = entries.filter(e => e.id && e.id !== 'undefined' && e.teamName); setEntries(valid); StorageDB.set('tbm_entries', valid); setIsSettingsOpen(false); } };
  
  // [NEW] Granular Clear Functions with Improved UX (Hard Reset & Safety Buffer)
  const handleClearRiskData = async () => {
      if(confirm("⚠️ 경고: 모든 '위험성평가' 데이터가 영구적으로 삭제됩니다.\n\n삭제 후, 시스템이 자동 갱신됩니다.")) {
          try {
              // 1. Clear DB First
              await StorageDB.set('monthly_assessment_list', []);
              // 2. Clear State
              setMonthlyAssessments([]);
              // 3. User Feedback & Safety Buffer (Ensure DB write commits)
              alert("✅ 위험성평가 데이터가 모두 초기화되었습니다.\n[확인]을 누르면 시스템이 갱신됩니다.");
              await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s buffer
              
              // 4. Force Reload
              window.location.href = window.location.href; // Hard Reload
          } catch (e) {
              alert("DB 초기화 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
          }
      }
  };

  const handleClearTBMData = async () => {
      if(confirm("⚠️ 경고: 모든 'TBM 일지' 데이터가 영구적으로 삭제됩니다.\n\n삭제 후, 시스템이 자동 갱신됩니다.")) {
          try {
              await StorageDB.set('tbm_entries', []);
              setEntries([]);
              alert("✅ TBM 일지 데이터가 모두 초기화되었습니다.\n[확인]을 누르면 시스템이 갱신됩니다.");
              await new Promise(resolve => setTimeout(resolve, 500));
              
              window.location.href = window.location.href;
          } catch (e) {
              alert("DB 초기화 중 오류가 발생했습니다.");
          }
      }
  };

  const handleResetData = async () => { 
      if (confirm('경고: 시스템을 완전히 초기화하시겠습니까?\n모든 데이터가 영구적으로 삭제됩니다.')) { 
          setIsSettingsOpen(false);
          await StorageDB.clear(); 
          localStorage.clear(); 
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.reload(); 
      } 
  };

  const renderContent = () => {
    return (
        <Suspense fallback={<LoadingScreen />}>
            {(() => {
                switch (currentView) {
                  case 'dashboard':
                    return <Dashboard entries={entries} onViewReport={() => { setReportTargetEntries(entries); setShowReportModal(true); }} onNavigateToReports={()=>setCurrentView('reports')} onNewEntry={(mode) => { setEditingEntry(null); setEntryMode(mode); setCurrentView('new'); }} onEdit={handleEditEntry} onOpenSettings={()=>setIsSettingsOpen(true)} onDelete={handleRequestDelete} onPrintSingle={(entry) => { setReportTargetEntries([entry]); setShowReportModal(true); }} />;
                  case 'new':
                    return <TBMForm onSave={handleSaveEntry} onCancel={()=>{setCurrentView('dashboard'); setEditingEntry(null)}} monthlyGuidelines={currentMonthGuidelines} initialData={editingEntry || undefined} onDelete={handleRequestDelete} teams={teams} mode={entryMode} />;
                  case 'risk-assessment':
                    return <RiskAssessmentManager assessments={monthlyAssessments} onSave={handleUpdateAssessments} />;
                  case 'reports':
                    return <ReportCenter entries={entries} onOpenPrintModal={() => { setReportTargetEntries(entries); setShowReportModal(true); }} signatures={signatures} teams={teams} />;
                  case 'data-lab': 
                    return <SafetyDataLab />;
                  default:
                    return <Dashboard entries={entries} onViewReport={() => { setReportTargetEntries(entries); setShowReportModal(true); }} onNavigateToReports={()=>setCurrentView('reports')} onNewEntry={(mode)=>{setEditingEntry(null); setEntryMode(mode); setCurrentView('new')}} onEdit={handleEditEntry} onOpenSettings={()=>setIsSettingsOpen(true)} onDelete={handleRequestDelete} onPrintSingle={(entry) => { setReportTargetEntries([entry]); setShowReportModal(true); }} />;
                }
            })()}
        </Suspense>
    );
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-[#F1F5F9]">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} onOpenSettings={() => setIsSettingsOpen(true)} onShowHistory={() => setIsHistoryOpen(true)} onShowIdentity={() => setIsIdentityOpen(true)} onNewEntryClick={() => setShowModeSelector(true)} />
      <main className="flex-1 md:ml-72 p-4 md:p-8 mb-0 pb-24 md:pb-8 relative z-10 w-full">
        <header className="flex justify-between items-center mb-6 md:mb-8 no-print">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
              {currentView === 'dashboard' && 'Integrated Dashboard'}
              {currentView === 'new' && (entryMode === 'BATCH' ? 'Batch Processing' : 'Individual Entry')}
              {currentView === 'risk-assessment' && 'Risk Assessment Management'}
              {currentView === 'reports' && 'Safe Work Report Center'}
              {currentView === 'data-lab' && 'Safety Data Lab'}
            </h1>
            <p className="text-[10px] md:text-sm font-medium text-slate-400 uppercase tracking-wider">
               (주)휘강건설 스마트 안전관리 시스템 v3.0.0
            </p>
          </div>
        </header>
        {renderContent()}
        {showReportModal && ( <Suspense fallback={<LoadingScreen />}> <ReportView entries={reportTargetEntries} onClose={() => { setShowReportModal(false); setReportTargetEntries([]); }} signatures={signatures} onUpdateSignature={handleUpdateSignature} onEdit={handleEditEntry} onDelete={handleRequestDelete} /> </Suspense> )}
        {isHistoryOpen && <HistoryModal onClose={() => setIsHistoryOpen(false)} />}
        {isIdentityOpen && <SystemIdentityModal onClose={() => setIsIdentityOpen(false)} />}
        {showModeSelector && <ModeSelectionModal onSelect={(mode) => { setEditingEntry(null); setEntryMode(mode); setCurrentView('new'); setShowModeSelector(false); }} onClose={() => setShowModeSelector(false)} />}
        {deleteState.isOpen && <DeleteConfirmModal info={deleteState.targetInfo} onConfirm={handleConfirmDelete} onCancel={() => setDeleteState({isOpen: false, targetId: null, targetInfo: null})} />}
        {isSettingsOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative max-h-[85vh]">
              <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 z-10"><X size={24} /></button>
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800">시스템 설정</h3>
                 <div className="flex gap-4 mt-4">
                    <button onClick={()=>setSettingsTab('teams')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${settingsTab === 'teams' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>팀 관리 ({teams.length})</button>
                    <button onClick={()=>setSettingsTab('backup')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${settingsTab === 'backup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>백업 및 복구</button>
                 </div>
              </div>
              {settingsTab === 'teams' && (
                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                        <label className="text-[11px] font-bold text-blue-600 block mb-2 uppercase tracking-wide">새로운 팀 추가</label>
                        <div className="flex gap-2">
                           <input type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="팀 이름" className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400"/>
                           <select value={newTeamCategory} onChange={(e) => setNewTeamCategory(e.target.value as TeamCategory)} className="px-2 py-2 rounded-lg border border-blue-200 text-sm font-bold outline-none bg-white">
                              {Object.values(TeamCategory).map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                           </select>
                           <button onClick={handleAddTeam} className="bg-blue-600 text-white px-4 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">추가</button>
                        </div>
                     </div>
                     <div className="space-y-2">
                        {teams.map(team => (
                           <div key={team.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-colors">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Users size={16}/></div>
                                 <div><p className="font-bold text-sm text-slate-800">{team.name}</p><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{team.category}</span></div>
                              </div>
                              <button onClick={() => handleDeleteTeam(team.id)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                           </div>
                        ))}
                     </div>
                  </div>
              )}
              {settingsTab === 'backup' && (
                  <div className="p-6 space-y-4">
                     <button onClick={handleExportData} className="w-full p-3 border rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50"><Download size={16}/> 데이터 백업 (통합)</button>
                     <div className="relative">
                        <button onClick={()=>fileInputRef.current?.click()} className="w-full p-3 border rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50"><Upload size={16}/> 데이터 복구 (병합/덮어쓰기)</button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleImportData} accept=".json" multiple/>
                     </div>
                     <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg text-center leading-relaxed">
                        <span className="font-bold text-slate-600">※ 데이터 복구 팁</span><br/>
                        중복 데이터가 많으면 복구 시 <span className="text-red-500 font-bold">[취소(덮어쓰기)]</span>를 선택하세요.<br/>
                        기존 데이터를 모두 지우고 백업 파일로 교체합니다.
                     </div>
                     <hr/>
                     <div className="grid grid-cols-2 gap-3">
                         <button onClick={handleClearRiskData} className="p-3 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg flex flex-col items-center justify-center gap-1 font-bold text-xs hover:bg-orange-100 transition-colors">
                             <Trash2 size={14}/> 위험성평가만 비우기
                         </button>
                         <button onClick={handleClearTBMData} className="p-3 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg flex flex-col items-center justify-center gap-1 font-bold text-xs hover:bg-orange-100 transition-colors">
                             <Trash2 size={14}/> TBM 일지만 비우기
                         </button>
                     </div>
                     <button onClick={handleResetData} className="w-full p-3 border border-red-200 bg-red-50 text-red-700 rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-red-100 transition-colors"><RefreshCw size={16}/> 시스템 전체 초기화 (Factory Reset)</button>
                  </div>
              )}
            </div>
          </div>, document.body
        )}
      </main>
    </div>
  );
}
export default App;
