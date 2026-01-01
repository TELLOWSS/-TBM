
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { TBMForm } from './components/TBMForm';
import { ReportView } from './components/ReportView';
import { ReportCenter } from './components/ReportCenter';
import { RiskAssessmentManager } from './components/RiskAssessmentManager';
import { HistoryModal } from './components/HistoryModal';
import { TBMEntry, MonthlyRiskAssessment, TeamOption, TeamCategory } from './types';
import { TEAMS } from './constants';
import { Download, Upload, Trash2, X, Settings, Database, Eraser, Plus, Users, Edit3, Save, FileText, ScanLine, Camera, Lock, Server, MessageSquare, BrainCircuit, ShieldCheck, PlayCircle, Sparkles, Target, Eye, Radar, Hexagon, Layers, Zap } from 'lucide-react';

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
                            <p className="text-[10px] md:text-sm font-bold text-slate-400 tracking-[0.4em] uppercase">Smart Safety System v2.8.2</p>
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

// ... (FeatureShowcase, DeleteConfirmModal remain the same) ...
// --- Feature Showcase Component ---
interface FeatureShowcaseProps {
   featureKey: 'risk' | 'proof' | 'feedback' | 'audit' | 'insight';
   onClose: () => void;
}

const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ featureKey, onClose }) => {
   const content = {
      risk: {
         title: "위험성평가 데이터 연동",
         subtitle: "Risk Assessment Integration",
         color: "text-emerald-500",
         bgGradient: "from-emerald-500/20 to-teal-500/5",
         description: "종이로 된 월간 위험성평가표를 AI가 분석하여 시스템 데이터로 변환합니다. 더 이상 수기로 옮겨 적을 필요가 없습니다.",
         steps: [
            { icon: <FileText size={24}/>, text: "월간 평가표 업로드 (PDF/IMG)" },
            { icon: <ScanLine size={24} className="animate-pulse"/>, text: "AI 광학 인식 및 공종 분류" },
            { icon: <Database size={24}/>, text: "TBM 작성 시 자동 매칭" }
         ]
      },
      proof: {
         title: "활동 증빙 자동화",
         subtitle: "Automated Activity Proof",
         color: "text-blue-500",
         bgGradient: "from-blue-500/20 to-indigo-500/5",
         description: "단순한 사진 저장이 아닙니다. 위변조가 불가능한 타임스탬프와 메타데이터를 포함하여 법적 효력을 갖춘 증빙 자료를 생성합니다.",
         steps: [
            { icon: <Camera size={24}/>, text: "현장 TBM 사진/영상 촬영" },
            { icon: <Lock size={24} className="animate-pulse"/>, text: "위조 방지 암호화 및 태깅" },
            { icon: <Server size={24}/>, text: "영구 보존 서버 저장" }
         ]
      },
      feedback: {
         title: "AI 기반 안전 피드백",
         subtitle: "AI Safety Coaching",
         color: "text-orange-500",
         bgGradient: "from-orange-500/20 to-amber-500/5",
         description: "작업 내용을 AI가 실시간으로 분석하여, 누락된 안전 수칙과 위험 요인을 관리자에게 즉시 코칭합니다.",
         steps: [
            { icon: <MessageSquare size={24}/>, text: "작업 내용 및 계획 입력" },
            { icon: <BrainCircuit size={24} className="animate-pulse"/>, text: "AI 안전 모델 실시간 분석" },
            { icon: <ShieldCheck size={24}/>, text: "맞춤형 누락 사항 코칭" }
         ]
      },
      audit: {
         title: "AI 스마트 TBM 품질 진단",
         subtitle: "Smart TBM Audit",
         color: "text-violet-500",
         bgGradient: "from-violet-500/20 to-purple-500/5",
         description: "영상 인식 AI가 TBM 활동을 4대 지표(참여도, 명확성, 보호구, 상호작용)로 정량 평가하여 형식적인 활동을 방지합니다.",
         steps: [
            { icon: <PlayCircle size={24}/>, text: "TBM 동영상 업로드 및 분석" },
            { icon: <ScanLine size={24} className="animate-pulse"/>, text: "Vision AI 동작/음성 인식" },
            { icon: <Sparkles size={24}/>, text: "품질 점수 및 리포트 생성" }
         ]
      },
      insight: {
         title: "AI 심층 정밀 진단 (Deep Insight)",
         subtitle: "AI Deep Learning Insight",
         color: "text-indigo-500",
         bgGradient: "from-indigo-500/20 to-violet-500/5",
         description: "관리자가 놓친 '사각지대'와 근로자의 '숨겨진 집중도'를 찾아냅니다. TBM의 내용(Bias)과 태도(Attitude)를 심층 분석합니다.",
         steps: [
            { icon: <Target size={24}/>, text: "Blind Spot(누락된 위험) 탐지" },
            { icon: <Eye size={24} className="animate-pulse"/>, text: "구역별 집중도 Heatmap 분석" },
            { icon: <Radar size={24}/>, text: "초개인화된 개선 코칭 제공" }
         ]
      }
   }[featureKey];

   return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
         <div 
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-scale-in relative border border-white/20"
            onClick={(e) => e.stopPropagation()}
         >
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br ${content.bgGradient} rounded-full blur-[100px] opacity-50 pointer-events-none -translate-y-1/2 translate-x-1/2`}></div>
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 z-50 transition-colors p-2 hover:bg-slate-100 rounded-full">
               <X size={24} />
            </button>
            <div className="flex flex-col md:flex-row min-h-[450px]">
               <div className="md:w-5/12 bg-slate-50/80 p-10 flex flex-col justify-center items-center relative overflow-hidden border-r border-slate-100">
                  <div className="relative z-10 flex flex-col items-center gap-6 w-full">
                     {content.steps.map((step, idx) => (
                        <div key={idx} className="relative group flex items-center gap-4 w-full">
                           <div className={`w-14 h-14 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center ${content.color} z-10 relative`}>
                              {step.icon}
                           </div>
                           {idx < content.steps.length - 1 && (
                              <div className="absolute left-7 top-14 w-0.5 h-10 bg-slate-200 -ml-[1px]"></div>
                           )}
                           <span className="text-sm font-bold text-slate-600 opacity-80">{step.text}</span>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="md:w-7/12 p-10 md:p-12 flex flex-col justify-center relative z-10">
                  <span className={`text-xs font-black uppercase tracking-widest mb-3 ${content.color} bg-slate-100 w-fit px-2 py-1 rounded`}>{content.subtitle}</span>
                  <h2 className="text-3xl font-black text-slate-900 mb-4 leading-tight">{content.title}</h2>
                  <p className="text-slate-500 text-base leading-relaxed font-medium mb-0 break-keep">{content.description}</p>
               </div>
            </div>
         </div>
      </div>,
      document.body
   );
};

// 내부용 삭제 확인 모달 컴포넌트
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
                 <span className="text-slate-500 font-bold">일자</span>
                 <span className="text-slate-800 font-bold">{info.date}</span>
              </div>
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
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
          >
            삭제 확정
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [entries, setEntries] = useState<TBMEntry[]>([]);
  // ... (Other state remains unchanged)
  const [monthlyAssessments, setMonthlyAssessments] = useState<MonthlyRiskAssessment[]>([]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [signatures, setSignatures] = useState<{safety: string | null, site: string | null}>({
    safety: null,
    site: null
  });
  
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [editingEntry, setEditingEntry] = useState<TBMEntry | null>(null); 
  
  const [entryMode, setEntryMode] = useState<'BATCH' | 'ROUTINE'>('ROUTINE');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false); // [NEW] Philosophy Modal State
  const [settingsTab, setSettingsTab] = useState<'backup' | 'teams'>('teams'); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: Global Feature Showcase State
  const [activeFeature, setActiveFeature] = useState<'risk' | 'proof' | 'feedback' | 'audit' | 'insight' | null>(null);

  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCategory, setNewTeamCategory] = useState<TeamCategory>(TeamCategory.FORMWORK);

  const [deleteState, setDeleteState] = useState<{isOpen: boolean, targetId: string | null, targetInfo: any | null}>({
    isOpen: false,
    targetId: null,
    targetInfo: null
  });

  const currentMonthGuidelines = useMemo(() => {
    if (monthlyAssessments.length === 0) return [];
    return [...monthlyAssessments].sort((a, b) => b.month.localeCompare(a.month))[0].priorities;
  }, [monthlyAssessments]);

  useEffect(() => {
    // ... (Loading effect remains unchanged)
    const savedEntries = localStorage.getItem('tbm_entries');
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries);
        if (Array.isArray(parsed)) {
            const sanitized = parsed.map((e: any, index: number) => {
              const safeId = `ENTRY-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
              return {
                ...e,
                id: (!e.id || e.id === 'undefined' || e.id === 'null') ? safeId : String(e.id),
                teamName: e.teamName || '미지정 팀',
                date: e.date || new Date().toISOString().split('T')[0],
                time: e.time || '00:00',
                attendeesCount: Number(e.attendeesCount) || 0,
                workDescription: e.workDescription !== undefined ? String(e.workDescription) : '',
                riskFactors: Array.isArray(e.riskFactors) ? e.riskFactors : [],
                safetyFeedback: Array.isArray(e.safetyFeedback) ? e.safetyFeedback.map(String) : []
              };
            });
            setEntries(sanitized);
        }
      } catch (e) {
        setEntries([]);
      }
    }

    const savedTeams = localStorage.getItem('site_teams');
    setTeams(savedTeams ? JSON.parse(savedTeams) : TEAMS);

    const savedMonthly = localStorage.getItem('monthly_assessment_list');
    const legacyMonthly = localStorage.getItem('monthly_assessment');

    if (savedMonthly) {
       try {
         setMonthlyAssessments(JSON.parse(savedMonthly));
       } catch (e) { setMonthlyAssessments([]); }
    } else if (legacyMonthly) {
       try {
         const legacy = JSON.parse(legacyMonthly);
         const newArray = [legacy];
         setMonthlyAssessments(newArray);
         localStorage.setItem('monthly_assessment_list', JSON.stringify(newArray));
       } catch (e) { setMonthlyAssessments([]); }
    }

    const savedSignatures = localStorage.getItem('signatures');
    if (savedSignatures) {
      try {
        setSignatures(JSON.parse(savedSignatures));
      } catch (e) {}
    }
  }, []);

  // ... (Methods handleAddTeam, handleDeleteTeam, handleSaveEntry, etc. remain unchanged)
  const handleAddTeam = () => {
    if(!newTeamName.trim()) return;
    const newTeam: TeamOption = { id: `team-${Date.now()}`, name: newTeamName.trim(), category: newTeamCategory };
    const updatedTeams = [...teams, newTeam];
    setTeams(updatedTeams);
    localStorage.setItem('site_teams', JSON.stringify(updatedTeams));
    setNewTeamName('');
    alert('팀이 추가되었습니다.');
  };

  const handleDeleteTeam = (id: string) => {
    if(confirm("이 팀을 목록에서 제거하시겠습니까?")) {
        const updatedTeams = teams.filter(t => t.id !== id);
        setTeams(updatedTeams);
        localStorage.setItem('site_teams', JSON.stringify(updatedTeams));
    }
  };

  const handleSaveEntry = (data: TBMEntry | TBMEntry[], shouldExit: boolean = true): boolean => {
    try {
        const newItems = Array.isArray(data) ? data : [data];
        const currentEntries = [...entries];
        newItems.forEach(newItem => {
            const index = currentEntries.findIndex(e => String(e.id) === String(newItem.id));
            if (index >= 0) {
                currentEntries[index] = newItem;
            } else {
                currentEntries.unshift(newItem);
            }
        });
        localStorage.setItem('tbm_entries', JSON.stringify(currentEntries));
        setEntries(currentEntries);
        setEditingEntry(null); 
        if (shouldExit) setCurrentView('dashboard');
        return true; 
    } catch (error: any) {
        console.error("Storage Save Failed:", error);
        return false; 
    }
  };
  
  const handleEditEntry = (entry: TBMEntry) => {
    setEditingEntry(entry);
    setShowReportModal(false);
    setEntryMode('ROUTINE');
    setCurrentView('new');
  };

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
     setEntries(newEntries);
     localStorage.setItem('tbm_entries', JSON.stringify(newEntries));
     if (editingEntry && String(editingEntry.id) === targetId) {
         setEditingEntry(null);
         setCurrentView('dashboard');
     }
     setDeleteState({ isOpen: false, targetId: null, targetInfo: null });
  };

  const handleUpdateAssessments = (newAssessments: MonthlyRiskAssessment[]) => {
    setMonthlyAssessments(newAssessments);
    localStorage.setItem('monthly_assessment_list', JSON.stringify(newAssessments));
  };

  const handleUpdateSignature = (role: 'safety' | 'site', dataUrl: string) => {
    const newSignatures = { ...signatures, [role]: dataUrl };
    setSignatures(newSignatures);
    localStorage.setItem('signatures', JSON.stringify(newSignatures));
  };

  const handleExportData = () => {
      const data = { tbm_entries: entries, monthly_assessment_list: monthlyAssessments, signatures, site_teams: teams, meta: { date: new Date() } };
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'SAPA_BACKUP.json'; a.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const json = JSON.parse(evt.target?.result as string);
              if(json.tbm_entries) {
                  setEntries(json.tbm_entries);
                  localStorage.setItem('tbm_entries', JSON.stringify(json.tbm_entries));
              }
              if(json.monthly_assessment_list) {
                  setMonthlyAssessments(json.monthly_assessment_list);
                  localStorage.setItem('monthly_assessment_list', JSON.stringify(json.monthly_assessment_list));
              }
              if(json.site_teams) {
                  setTeams(json.site_teams);
                  localStorage.setItem('site_teams', JSON.stringify(json.site_teams));
              }
              alert("복구 완료");
              setIsSettingsOpen(false);
          } catch(err) { alert("파일 오류"); }
      };
      reader.readAsText(file);
  };

  const handleCleanupData = () => {
     if (confirm('오류 데이터(빈 항목, ID 없음)를 강제로 정리하시겠습니까?')) {
        setEntries(prev => {
            const valid = prev.filter(e => e.id && e.id !== 'undefined' && e.teamName);
            localStorage.setItem('tbm_entries', JSON.stringify(valid));
            alert(`${prev.length - valid.length}개의 오류 항목이 삭제되었습니다.`);
            return valid;
        });
        setIsSettingsOpen(false);
     }
  };

  const handleResetData = () => {
    if (confirm('모든 데이터를 삭제하고 초기화하시겠습니까?')) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard 
                  entries={entries} 
                  onViewReport={()=>setShowReportModal(true)} 
                  onNavigateToReports={()=>setCurrentView('reports')}
                  onNewEntry={(mode) => {
                      setEditingEntry(null); 
                      setEntryMode(mode); 
                      setCurrentView('new');
                  }} 
                  onEdit={handleEditEntry} 
                  onOpenSettings={()=>setIsSettingsOpen(true)} 
                  onDelete={handleRequestDelete} 
               />;
      case 'new':
        return <TBMForm 
                  onSave={handleSaveEntry} 
                  onCancel={()=>{setCurrentView('dashboard'); setEditingEntry(null)}} 
                  monthlyGuidelines={currentMonthGuidelines} 
                  initialData={editingEntry || undefined} 
                  onDelete={handleRequestDelete} 
                  teams={teams} 
                  mode={entryMode}
               />;
      case 'risk-assessment':
        return <RiskAssessmentManager assessments={monthlyAssessments} onSave={handleUpdateAssessments} />;
      case 'reports':
        return <ReportCenter entries={entries} onOpenPrintModal={()=>setShowReportModal(true)} signatures={signatures} teams={teams} />;
      default:
        return <Dashboard 
                  entries={entries} 
                  onViewReport={()=>setShowReportModal(true)} 
                  onNavigateToReports={()=>setCurrentView('reports')} 
                  onNewEntry={(mode)=>{setEditingEntry(null); setEntryMode(mode); setCurrentView('new')}} 
                  onEdit={handleEditEntry} 
                  onOpenSettings={()=>setIsSettingsOpen(true)} 
                  onDelete={handleRequestDelete} 
               />;
    }
  };

  // 5 Key Features Config
  const featureButtons = [
      { key: 'risk', label: 'Risk Data', icon: <FileText size={14}/>, color: 'text-emerald-600', bg: 'bg-emerald-100' },
      { key: 'proof', label: 'Legal Proof', icon: <Camera size={14}/>, color: 'text-blue-600', bg: 'bg-blue-100' },
      { key: 'feedback', label: 'AI Coach', icon: <MessageSquare size={14}/>, color: 'text-orange-600', bg: 'bg-orange-100' },
      { key: 'audit', label: 'Quality', icon: <Sparkles size={14}/>, color: 'text-violet-600', bg: 'bg-violet-100' },
      { key: 'insight', label: 'Insight', icon: <Radar size={14}/>, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-[#F1F5F9]">
      <Navigation 
         currentView={currentView} 
         setCurrentView={setCurrentView} 
         onOpenSettings={() => setIsSettingsOpen(true)} 
         onShowHistory={() => setIsHistoryOpen(true)}
         onShowIdentity={() => setIsIdentityOpen(true)}
      />
      {/* 
         Updated Main Content Layout:
         - Added 'md:ml-72' for desktop sidebar spacing.
         - Added 'pb-24' to prevent content from being hidden behind the mobile bottom nav.
      */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 mb-0 pb-24 md:pb-8 relative z-10 w-full">
        <header className="flex justify-between items-center mb-6 md:mb-8 no-print">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
              {currentView === 'dashboard' && 'Integrated Dashboard'}
              {currentView === 'new' && (entryMode === 'BATCH' ? 'Batch Processing' : 'Individual Entry')}
              {currentView === 'risk-assessment' && 'Risk Assessment Management'}
              {currentView === 'reports' && 'Safe Work Report Center'}
            </h1>
            <p className="text-[10px] md:text-sm font-medium text-slate-400 uppercase tracking-wider">
               (주)휘강건설 스마트 안전관리 시스템 v2.8.2
            </p>
          </div>

          {/* RIGHT SIDE HEADER: 5 Core Features (Only visible on Desktop/Tablet) */}
          {currentView === 'dashboard' && (
              <div className="hidden md:flex gap-3">
                  {featureButtons.map((btn) => (
                      <button
                          key={btn.key}
                          onClick={() => setActiveFeature(btn.key as any)}
                          className="flex flex-col items-center gap-1 group"
                          title={btn.label}
                      >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm ${btn.bg} ${btn.color} group-hover:-translate-y-1 group-hover:shadow-md`}>
                              {btn.icon}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-600 uppercase tracking-tight">{btn.label}</span>
                      </button>
                  ))}
              </div>
          )}
        </header>

        {renderContent()}

        {showReportModal && (
          <ReportView entries={entries} onClose={() => setShowReportModal(false)} signatures={signatures} onUpdateSignature={handleUpdateSignature} onEdit={handleEditEntry} onDelete={handleRequestDelete} />
        )}
        
        {isHistoryOpen && (
          <HistoryModal onClose={() => setIsHistoryOpen(false)} />
        )}

        {isIdentityOpen && (
            <SystemIdentityModal onClose={() => setIsIdentityOpen(false)} />
        )}

        {/* Feature Showcase Modal */}
        {activeFeature && <FeatureShowcase featureKey={activeFeature} onClose={() => setActiveFeature(null)} />}

        {deleteState.isOpen && (
           <DeleteConfirmModal info={deleteState.targetInfo} onConfirm={handleConfirmDelete} onCancel={() => setDeleteState({isOpen: false, targetId: null, targetInfo: null})} />
        )}

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
                     <button onClick={handleExportData} className="w-full p-3 border rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50"><Download size={16}/> 데이터 백업</button>
                     <div className="relative">
                        <button onClick={()=>fileInputRef.current?.click()} className="w-full p-3 border rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50"><Upload size={16}/> 데이터 복구</button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleImportData} accept=".json"/>
                     </div>
                     <hr/>
                     <button onClick={handleCleanupData} className="w-full p-3 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg flex items-center justify-center gap-2 font-bold"><Eraser size={16}/> 오류 데이터 정리</button>
                     <button onClick={handleResetData} className="w-full p-3 border border-red-200 bg-red-50 text-red-700 rounded-lg flex items-center justify-center gap-2 font-bold"><Trash2 size={16}/> 시스템 초기화</button>
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
