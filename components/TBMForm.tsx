
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TBMEntry, RiskAssessmentItem, SafetyGuideline, TeamOption, TBMAnalysisResult, ExtractedTBMData } from '../types';
import { analyzeMasterLog, evaluateTBMVideo } from '../services/geminiService';
import { compressVideo } from '../utils/videoUtils';
import { Upload, Camera, Sparkles, AlertTriangle, CheckCircle2, Loader2, FileText, X, ShieldCheck, Layers, ArrowLeft, Trash2, Film, Save, ZoomIn, ZoomOut, Maximize, Minimize, RotateCw, Clock, Plus, Check, PlayCircle, BarChart, Mic, Volume2, Edit2, RefreshCcw, Target, Eye, AlertOctagon, UserCheck, HelpCircle, FileStack, ScanLine, ListChecks, Zap, Files, Copy, ArrowRight, BrainCircuit, MessageSquare, Video, Database, Rocket, CalendarCheck, Image as ImageIcon, PenTool, MousePointerClick, FileInput } from 'lucide-react';

interface TBMFormProps {
  onSave: (entry: TBMEntry | TBMEntry[], shouldExit?: boolean) => boolean;
  onCancel: () => void;
  monthlyGuidelines: SafetyGuideline[];
  initialData?: TBMEntry;
  onDelete?: (id: string) => void;
  teams: TeamOption[];
  mode?: 'BATCH' | 'ROUTINE';
}

interface SavedFormState {
  entryDate: string;
  entryTime: string;
  teamId: string;
  leaderName: string;
  attendeesCount: number;
  workDescription: string;
  riskFactors: RiskAssessmentItem[];
  safetyFeedback: string[];
  tbmPhotoPreview: string | null;
  tbmVideoPreview: string | null;
  tbmVideoFileName: string | null;
  currentLogBase64: string | null;
  videoAnalysis: TBMAnalysisResult | null;
  extractedResults?: ExtractedTBMData[];
  currentResultIndex?: number;
  isDateFromAI?: boolean;
}

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string | null;
  isPdf: boolean;
  status: 'pending' | 'processing' | 'done' | 'error'; 
  teamsRegistered: string[];
  savedFormData?: SavedFormState;
  analysisCache?: ExtractedTBMData[]; 
}

// ... (blobToBase64 and resizeBase64Image helpers remain unchanged)
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
};

const resizeBase64Image = (base64: string, maxWidth: number = 1024, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height *= maxWidth / width));
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } else {
        reject(new Error("Canvas context unavailable"));
      }
    };
    img.onerror = (err) => reject(err);
  });
};

// ... (GuideScreen component remains unchanged) ...
const GuideScreen = ({ mode, onStart }: { mode: 'BATCH' | 'ROUTINE', onStart: () => void }) => {
    return (
        <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-10">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-xl ${mode === 'BATCH' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                        {mode === 'BATCH' ? <FileStack size={40} /> : <Camera size={40} />}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-3 tracking-tight">
                        {mode === 'BATCH' ? '종합 일지 빅데이터 마이닝' : '스마트 TBM 개별 등록'}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed">
                        {mode === 'BATCH' 
                            ? "종이로 작성된 '일일안전작업종합일지'를 업로드하세요. AI가 수십 개의 팀 데이터를 자동으로 분리하고 추출하여 데이터베이스화합니다." 
                            : "팀장님이 현장에서 직접 활동 내역을 등록합니다. 사진과 영상을 업로드하면 AI가 위험 요인을 분석하고 피드백을 제공합니다."}
                    </p>
                </div>

                {mode === 'BATCH' ? (
                    /* Batch Mode Infographic */
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-lg transition-all">
                            <div className="absolute top-6 right-6 text-indigo-100 group-hover:text-indigo-500 transition-colors"><FileInput size={40}/></div>
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded mb-4 inline-block">STEP 01</span>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">종합 파일 업로드</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                스캔한 PDF 또는 촬영한 이미지 파일을 업로드하세요.<br/>
                                <strong>*여러 장의 파일도 한 번에 처리가 가능합니다.</strong>
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-lg transition-all">
                            <div className="absolute top-6 right-6 text-indigo-100 group-hover:text-indigo-500 transition-colors"><Sparkles size={40}/></div>
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded mb-4 inline-block">STEP 02</span>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">AI 자동 추출</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                AI가 문서 내의 <strong>날짜, 팀명, 인원, 위험요인</strong>을 자동으로 식별하고 구조화된 데이터로 변환합니다.
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-lg transition-all">
                            <div className="absolute top-6 right-6 text-indigo-100 group-hover:text-indigo-500 transition-colors"><Database size={40}/></div>
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded mb-4 inline-block">STEP 03</span>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">DB 저장 완료</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                추출된 데이터를 확인 후 <strong>'일괄 저장'</strong> 버튼을 누르면 대시보드에 즉시 반영됩니다.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Routine Mode Infographic */
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:border-emerald-200 transition-colors">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                                <MousePointerClick size={20}/>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">팀 선택</h3>
                            <p className="text-[10px] text-slate-400">작업할 팀을 선택하세요.</p>
                        </div>
                        <div className="flex items-center justify-center md:rotate-0 rotate-90 text-slate-300"><ArrowRight/></div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:border-emerald-200 transition-colors">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                                <Camera size={20}/>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">사진/영상 촬영</h3>
                            <p className="text-[10px] text-slate-400">활동 모습을 담아주세요.</p>
                        </div>
                        <div className="flex items-center justify-center md:rotate-0 rotate-90 text-slate-300"><ArrowRight/></div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center hover:border-emerald-200 transition-colors">
                            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                                <BrainCircuit size={20}/>
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1">AI 안전 피드백</h3>
                            <p className="text-[10px] text-slate-400">누락된 위험을 코칭받으세요.</p>
                        </div>
                    </div>
                )}

                <div className="text-center">
                    <button 
                        onClick={onStart}
                        className={`px-10 py-4 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-lg flex items-center gap-2 mx-auto ${mode === 'BATCH' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-emerald-600 shadow-emerald-200'}`}
                    >
                        <Rocket size={20} className="animate-pulse" />
                        작업 시작하기
                    </button>
                    <p className="mt-4 text-xs text-slate-400 font-medium">
                        * 오른쪽 상단의 <HelpCircle size={12} className="inline align-middle"/> 아이콘을 눌러 언제든 다시 볼 수 있습니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export const TBMForm: React.FC<TBMFormProps> = ({ onSave, onCancel, monthlyGuidelines, initialData, onDelete, teams, mode = 'ROUTINE' }) => {
  // ... (State declarations remain unchanged) ...
  // --- Global State ---
  // [NEW] Guide State - Default to true only if NOT editing existing data
  const [showGuide, setShowGuide] = useState(!initialData);
  
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [loadedFileId, setLoadedFileId] = useState<string | null>(null);

  // --- Mobile Tab State ---
  const [activeMobileTab, setActiveMobileTab] = useState<'queue' | 'preview' | 'form'>('queue');

  // --- Workspace State ---
  const [viewerMode, setViewerMode] = useState<'fit' | 'scroll'>('fit'); 
  const [imgRotation, setImgRotation] = useState(0);
  const [imgScale, setImgScale] = useState(1);
  
  // Form Fields
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDateFromAI, setIsDateFromAI] = useState(false);
  const [entryTime, setEntryTime] = useState('07:30');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [leaderName, setLeaderName] = useState('');
  const [attendeesCount, setAttendeesCount] = useState<number>(0);
  const [workDescription, setWorkDescription] = useState('');
  const [riskFactors, setRiskFactors] = useState<RiskAssessmentItem[]>([]);
  const [safetyFeedback, setSafetyFeedback] = useState<string[]>([]);
  
  // Media State
  const [tbmPhotoFile, setTbmPhotoFile] = useState<File | null>(null);
  const [tbmPhotoPreview, setTbmPhotoPreview] = useState<string | null>(null);
  
  const [tbmVideoFile, setTbmVideoFile] = useState<File | null>(null);
  const [tbmVideoPreview, setTbmVideoPreview] = useState<string | null>(null);
  const [tbmVideoFileName, setTbmVideoFileName] = useState<string | null>(null);
  
  // Video Analysis State
  const [videoAnalysis, setVideoAnalysis] = useState<TBMAnalysisResult | null>(null);
  const [videoStatusMessage, setVideoStatusMessage] = useState<string>(''); 
  
  // Editing Analysis State
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [tempAnalysis, setTempAnalysis] = useState<TBMAnalysisResult | null>(null);

  // Safety Feedback Editing State
  const [editingFeedbackIndex, setEditingFeedbackIndex] = useState<number | null>(null);
  const [tempFeedbackText, setTempFeedbackText] = useState("");

  // Current Doc Base64
  const [currentLogBase64, setCurrentLogBase64] = useState<string | null>(null);

  // UI State - SPLIT ANALYSIS STATES
  const [isDocAnalyzing, setIsDocAnalyzing] = useState(false);
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Multi-Team Extraction State
  const [extractedResults, setExtractedResults] = useState<ExtractedTBMData[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);

  // Auto-Processing State
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [autoProcessStats, setAutoProcessStats] = useState({ currentFileIndex: 0, totalFiles: 0, totalTeamsSaved: 0 });
  
  // [NEW] Dirty Check State
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const queueInputRef = useRef<HTMLInputElement>(null);
  const sidebarInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ... (Effects and Helpers remain unchanged) ...
  useEffect(() => {
    return () => {
      // Clean up video preview URL on unmount or change
      if (tbmVideoPreview && tbmVideoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(tbmVideoPreview);
      }
    };
  }, [tbmVideoPreview]);

  // --- Mark Dirty on Change ---
  useEffect(() => {
      // Only mark dirty if it's not the initial load
      if (leaderName || workDescription || attendeesCount > 0 || riskFactors.length > 0) {
          setIsDirty(true);
      }
  }, [leaderName, workDescription, attendeesCount, riskFactors]);

  // --- Helpers ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1024;
          if (width > MAX_WIDTH) {
            height = Math.round((height *= MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
             resolve(dataUrl);
          } else {
             reject(new Error("Canvas context unavailable"));
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const getCurrentFormState = (): SavedFormState => ({
    entryDate, entryTime, teamId, leaderName, attendeesCount,
    workDescription, riskFactors, safetyFeedback,
    tbmPhotoPreview, tbmVideoPreview, tbmVideoFileName, currentLogBase64,
    videoAnalysis, extractedResults, currentResultIndex,
    isDateFromAI
  });

  const resetFormFields = () => {
     setLeaderName('');
     setAttendeesCount(0);
     setWorkDescription('');
     setRiskFactors([]);
     setSafetyFeedback([]);
     setTbmPhotoFile(null);
     setTbmPhotoPreview(null);
     setTbmVideoFile(null);
     setTbmVideoPreview(null);
     setTbmVideoFileName(null);
     setVideoAnalysis(null);
     setIsEditingAnalysis(false);
     setTempAnalysis(null);
     setVideoStatusMessage('');
     setEditingFeedbackIndex(null);
     setEntryTime('07:30'); 
     setExtractedResults([]);
     setCurrentResultIndex(0);
     setIsDirty(false); // Reset dirty state
     setIsDateFromAI(false); // Reset Date Source
     if (photoInputRef.current) photoInputRef.current.value = '';
     if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const restoreFormData = (data: SavedFormState) => {
    setEntryDate(data.entryDate);
    setEntryTime(data.entryTime);
    setTeamId(data.teamId);
    setLeaderName(data.leaderName);
    setAttendeesCount(data.attendeesCount);
    setWorkDescription(data.workDescription);
    setRiskFactors(data.riskFactors || []);
    setSafetyFeedback(data.safetyFeedback || []);
    setTbmPhotoPreview(data.tbmPhotoPreview);
    setTbmVideoPreview(data.tbmVideoPreview);
    setTbmVideoFileName(data.tbmVideoFileName);
    setCurrentLogBase64(data.currentLogBase64);
    setVideoAnalysis(data.videoAnalysis || null);
    setExtractedResults(data.extractedResults || []);
    setCurrentResultIndex(data.currentResultIndex || 0);
    setIsDateFromAI(data.isDateFromAI || false);
    setViewerMode('fit'); setImgRotation(0); setImgScale(1);
    setIsDirty(false); // Restored data is considered "clean"
  };
  
  // ... (handleSafeCancel, compressImage, getCurrentFormState, etc. remain unchanged) ...

  const handleSafeCancel = () => {
      if (isDirty && !initialData) {
          if (!confirm("작성 중인 내용이 있습니다. 저장하지 않고 나가시겠습니까?")) {
              return;
          }
      }
      onCancel();
  };

  // --- OVERHAULED: Pure Data Pipeline Mode (No Image Storage) ---
  const handleAutoProcessQueue = async () => {
      const pendingItems = queue.filter(q => q.status === 'pending');
      if (pendingItems.length === 0) {
          alert("대기 중인 파일이 없습니다.");
          return;
      }

      if (!confirm(`[빅데이터 마이닝 모드] ${pendingItems.length}개의 파일을 처리합니다.\n\nAI가 문서를 분석하여 '정량적 통계 데이터'만 추출하고,\n용량 확보를 위해 '원본 이미지'는 저장하지 않습니다.\n\n(논문/보고서용 통계 확보에 최적화)\n진행하시겠습니까?`)) {
          return;
      }

      setIsAutoProcessing(true);
      // Reset UI to prevent interference
      setActiveQueueId(null); 
      setLoadedFileId(null);
      resetFormFields();

      setAutoProcessStats({ currentFileIndex: 0, totalFiles: pendingItems.length, totalTeamsSaved: 0 });
      let savedCountTotal = 0;
      let errorCount = 0;

      try {
          // Iterate
          for (let i = 0; i < pendingItems.length; i++) {
              const item = pendingItems[i];
              setAutoProcessStats(prev => ({ ...prev, currentFileIndex: i + 1 }));

              try {
                  // 1. Mark as Processing
                  setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'processing' } : q));
                  
                  // 2. Load File
                  const base64Content = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = (e) => resolve(e.target?.result as string);
                      reader.onerror = (e) => reject(e);
                      reader.readAsDataURL(item.file);
                  });
                  
                  // 3. AI Data Mining (Gemini 3.0 Flash) - [CRITICAL] PASSING 'BATCH' MODE
                  const base64Data = base64Content.split(',')[1];
                  const docResults = await analyzeMasterLog(base64Data, item.file.type, monthlyGuidelines, 'BATCH');
                  
                  if (docResults.length === 0) {
                      console.warn("AI extraction returned empty for", item.file.name);
                      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q));
                      errorCount++;
                      continue;
                  }

                  // 4. Build Data Entities
                  const batchEntries: TBMEntry[] = [];
                  const savedTeamNames: string[] = [];
                  
                  for (let tIdx = 0; tIdx < docResults.length; tIdx++) {
                      const data = docResults[tIdx];
                      
                      // Match Team ID
                      let finalTeamId = '';
                      let finalTeamName = data.teamName;
                      
                      const normalizedInput = data.teamName.replace(/\s+/g, '').toLowerCase();
                      const matched = teams.find(t => {
                          const normalizedTeam = t.name.replace(/\s+/g, '').toLowerCase();
                          return normalizedInput.includes(normalizedTeam) || normalizedTeam.includes(normalizedInput);
                      });
                      if (matched) {
                          finalTeamId = matched.id;
                          finalTeamName = matched.name;
                      }

                      // [CRITICAL] Use detectedDate or Fallback to entryDate (Today)
                      // In Big Data Mode, detectedDate is prioritised.
                      const finalDate = data.detectedDate || entryDate;

                      // [Safety Net] Ensure Synthetic Video Analysis is present
                      const safeVideoAnalysis = (data as any).videoAnalysis || {
                          score: 80,
                          evaluation: "데이터 분석 전용 (자동 생성)",
                          analysisSource: 'DOCUMENT',
                          details: { participation: 'MODERATE', voiceClarity: 'CLEAR', ppeStatus: 'GOOD', interaction: false },
                          focusAnalysis: { overall: 80, distractedCount: 0, focusZones: { front: 'HIGH', back: 'HIGH', side: 'HIGH' } },
                          insight: { mentionedTopics: [], missingTopics: [], suggestion: "" },
                          feedback: []
                      };

                      const entry: TBMEntry = {
                          id: `DATA-${Date.now()}-${tIdx}-${Math.random().toString(36).substring(2, 5)}`,
                          date: finalDate,
                          time: '07:30',
                          teamId: finalTeamId || 'unknown',
                          teamName: finalTeamName,
                          leaderName: data.leaderName || "",
                          attendeesCount: data.attendeesCount || 0,
                          workDescription: data.workDescription || "내용 없음", 
                          riskFactors: data.riskFactors || [],
                          safetyFeedback: data.safetyFeedback || [],
                          // [CRITICAL] Do NOT save images in Data Mining mode to save space
                          tbmPhotoUrl: undefined, 
                          originalLogImageUrl: undefined, 
                          originalLogMimeType: undefined,
                          videoAnalysis: safeVideoAnalysis,
                          createdAt: Date.now() + tIdx
                      };
                      batchEntries.push(entry);
                      savedTeamNames.push(finalTeamName);
                  }

                  // 5. Persist - Save immediately per file to avoid data loss
                  // Explicitly pass 'false' to avoid exiting
                  const saveSuccess = onSave(batchEntries, false);
                  
                  if (saveSuccess) {
                      savedCountTotal += batchEntries.length;
                      setQueue(prev => prev.map(q => q.id === item.id ? { 
                          ...q, 
                          status: 'done', 
                          teamsRegistered: savedTeamNames 
                      } : q));
                      setAutoProcessStats(prev => ({ ...prev, totalTeamsSaved: savedCountTotal }));
                  } else {
                      console.error("Storage Limit Reached");
                      throw new Error("Browser Storage Full");
                  }

              } catch (e) {
                  console.error(`Error processing file ${item.file.name}:`, e);
                  setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error' } : q));
                  errorCount++;
              }
              
              // Tiny delay for UI refresh to prevent browser hang
              await new Promise(r => setTimeout(r, 100));
          }

          alert(`✅ 빅데이터 마이닝 완료!\n\n- 성공: ${savedCountTotal}개 팀\n- 실패한 파일: ${errorCount}개\n\n추출된 데이터가 대시보드에 반영되었습니다.\n(보고서 센터에서 CSV로 다운로드하여 분석하세요)`);
      } finally {
          setIsAutoProcessing(false);
          setActiveQueueId(null);
          resetFormFields();
          setCurrentLogBase64(null);
          setLoadedFileId(null);
      }
  };

  // ... (Other handlers like edit analysis etc.) ...
  
  const handleStartEditAnalysis = () => {
    if (videoAnalysis) {
      setTempAnalysis(JSON.parse(JSON.stringify(videoAnalysis)));
      setIsEditingAnalysis(true);
    }
  };

  const handleCancelEditAnalysis = () => {
    setTempAnalysis(null);
    setIsEditingAnalysis(false);
  };

  const handleSaveEditAnalysis = () => {
    if (tempAnalysis) {
      setVideoAnalysis(tempAnalysis);
    }
    setIsEditingAnalysis(false);
    setTempAnalysis(null);
  };

  const updateTempAnalysis = (path: string[], value: any) => {
      setTempAnalysis(prev => {
          if (!prev) return null;
          const newState = { ...prev };
          let current: any = newState;
          for (let i = 0; i < path.length - 1; i++) {
              current = current[path[i]];
          }
          current[path[path.length - 1]] = value;
          return newState;
      });
  };

  const handleRiskChange = (index: number, field: 'risk' | 'measure', value: string) => {
    const newRisks = [...riskFactors];
    newRisks[index] = { ...newRisks[index], [field]: value };
    setRiskFactors(newRisks);
  };
  const addRiskFactor = () => setRiskFactors([...riskFactors, { risk: '', measure: '' }]);
  const removeRiskFactor = (index: number) => setRiskFactors(riskFactors.filter((_, i) => i !== index));

  const startEditingFeedback = (index: number, text: string) => { setEditingFeedbackIndex(index); setTempFeedbackText(text); };
  const saveEditingFeedback = () => { if (editingFeedbackIndex !== null) { const newF = [...safetyFeedback]; newF[editingFeedbackIndex] = tempFeedbackText; setSafetyFeedback(newF); setEditingFeedbackIndex(null); }};
  const cancelEditingFeedback = () => setEditingFeedbackIndex(null);

  const populateFieldsFromData = (data: ExtractedTBMData) => {
      setLeaderName(data.leaderName);
      setAttendeesCount(data.attendeesCount);
      setWorkDescription(data.workDescription);
      setRiskFactors(data.riskFactors || []);
      setSafetyFeedback(data.safetyFeedback || []);
      
      if ((data as any).videoAnalysis) {
          setVideoAnalysis((data as any).videoAnalysis);
      } else {
          setVideoAnalysis(null);
      }
      
      if (data.detectedDate) {
          setEntryDate(data.detectedDate);
          setIsDateFromAI(true); // MARK AS AI DETECTED
      } else {
          setIsDateFromAI(false);
      }

      if (data.teamName) {
          const normalizedInput = data.teamName.replace(/\s+/g, '').toLowerCase();
          const matched = teams.find(t => {
              const normalizedTeam = t.name.replace(/\s+/g, '').toLowerCase();
              return normalizedInput === normalizedTeam || normalizedInput.includes(normalizedTeam) || normalizedTeam.includes(normalizedInput);
          });
          if (matched) setTeamId(matched.id);
      }
  };

  const syncCurrentToExtracted = () => {
      if (mode === 'BATCH' && extractedResults.length > 0 && extractedResults[currentResultIndex]) {
          const currentTeamOption = teams.find(t => t.id === teamId);
          
          setExtractedResults(prev => {
              const updated = [...prev];
              updated[currentResultIndex] = {
                  ...updated[currentResultIndex],
                  leaderName,
                  attendeesCount,
                  workDescription,
                  riskFactors,
                  safetyFeedback,
                  teamName: currentTeamOption ? currentTeamOption.name : updated[currentResultIndex].teamName,
                  detectedDate: entryDate,
                  videoAnalysis: videoAnalysis || (updated[currentResultIndex] as any).videoAnalysis
              } as ExtractedTBMData;
              return updated;
          });
      }
  };

  const handleSelectExtractedResult = (index: number) => {
      syncCurrentToExtracted();
      
      if (extractedResults[index]) {
          setCurrentResultIndex(index);
          populateFieldsFromData(extractedResults[index]);
          setActiveMobileTab('form'); // Auto switch on mobile
      }
  };

  // [UPDATED] Document Analysis Handler - Pass 'ROUTINE' if in routine mode
  const handleDocAnalyze = async () => {
    const activeItem = queue.find(q => q.id === activeQueueId);
    
    if (!currentLogBase64 && !activeItem) {
        alert("분석할 문서(사진/PDF)가 없습니다.");
        return;
    }

    if (activeItem && activeItem.analysisCache && activeItem.analysisCache.length > 0) {
        setExtractedResults(activeItem.analysisCache);
        setCurrentResultIndex(0);
        populateFieldsFromData(activeItem.analysisCache[0]);
        setVideoStatusMessage("✅ 저장된 문서 분석 결과 불러옴");
        setTimeout(() => setVideoStatusMessage(""), 2000);
        setActiveMobileTab('form');
        return;
    }

    setIsDocAnalyzing(true);
    setVideoStatusMessage("페이지별 팀 정보 식별 중...");
    
    if (activeQueueId) {
        setQueue(prev => prev.map(q => q.id === activeQueueId ? { ...q, status: 'processing' } : q));
    }

    try {
      if (currentLogBase64 && extractedResults.length === 0) {
          const base64Data = currentLogBase64.split(',')[1];
          const mimeType = activeItem?.file.type || 'image/jpeg';
          
          // [CRITICAL] Pass 'ROUTINE' mode for individual entry (don't fake scores)
          const analysisMode = mode === 'BATCH' ? 'BATCH' : 'ROUTINE';
          const docResults = await analyzeMasterLog(base64Data, mimeType, monthlyGuidelines, analysisMode);
          
          if (docResults.length > 0) {
              setExtractedResults(docResults);
              setCurrentResultIndex(0);
              populateFieldsFromData(docResults[0]);

              if (activeQueueId) {
                  setQueue(prev => prev.map(q => q.id === activeQueueId ? { 
                      ...q, 
                      analysisCache: docResults,
                      status: 'pending'
                  } : q));
              }
              setActiveMobileTab('form'); // Switch to form on mobile
          } else {
             alert("문서 내용을 인식하지 못했습니다.");
             if (activeQueueId) {
                setQueue(prev => prev.map(q => q.id === activeQueueId ? { ...q, status: 'error' } : q));
             }
          }
      }
    } catch (err: any) {
      console.error(err);
      alert(`문서 분석 중 오류가 발생했습니다: ${err.message}`);
      if (activeQueueId) {
         setQueue(prev => prev.map(q => q.id === activeQueueId ? { ...q, status: 'error' } : q));
      }
    } finally {
      setIsDocAnalyzing(false);
      setVideoStatusMessage('');
    }
  };

  const handleVideoAnalyze = async () => {
      if (!tbmVideoFile) {
          alert("분석할 동영상이 없습니다.");
          return;
      }

      setIsVideoAnalyzing(true);
      setVideoStatusMessage("영상 분석 준비 중...");

      try {
          setVideoStatusMessage("영상 압축 및 오디오 추출 (5초 캡처)...");
          const compressedBlob = await compressVideo(tbmVideoFile);
          
          setVideoStatusMessage("AI 영상 정밀 진단 중 (Vision + Audio)...");
          const videoBase64Url = await blobToBase64(compressedBlob);
          const base64Data = videoBase64Url.split(',')[1];
          
          const contextDesc = workDescription || "일반 건설 작업 TBM";
          const videoResult = await evaluateTBMVideo(base64Data, 'video/webm', contextDesc);

          if (videoResult) {
              setVideoAnalysis(videoResult);
              if (videoResult.insight?.suggestion) {
                  if (!safetyFeedback.some(f => f.includes(videoResult.insight.suggestion))) {
                      setSafetyFeedback(prev => [...prev, `[AI 코칭] ${videoResult.insight.suggestion}`]);
                  }
              }
          }
      } catch (err: any) {
          console.error(err);
          alert(`영상 분석 중 오류가 발생했습니다: ${err.message}`);
      } finally {
          setIsVideoAnalyzing(false);
          setVideoStatusMessage('');
      }
  };

  // ... (rest of the component structure, useEffects, and JSX rendering - NO changes needed below this point other than reusing existing logic)
  // Re-exporting component for brevity as logic inside useEffects and handlers is updated via closures over updated helper functions/constants above.

  useEffect(() => {
    if (!activeQueueId) return;
    const item = queue.find(q => q.id === activeQueueId);
    if (!item) return;

    if (loadedFileId !== activeQueueId) {
        setLoadedFileId(activeQueueId);
        
        if (item.savedFormData) {
           restoreFormData(item.savedFormData);
        } else {
           resetFormFields();
           const reader = new FileReader();
           reader.onload = (event) => {
                const base64Result = event.target?.result as string;
                setCurrentLogBase64(base64Result);
                
                if (mode === 'ROUTINE') {
                    setTbmPhotoPreview(null); 
                } else {
                    setTbmPhotoPreview(base64Result); 
                }
                setViewerMode('fit'); setImgRotation(0); setImgScale(1);
                
                const dateMatch = item.file.name.match(/(\d{4})[-.]?(\d{2})[-.]?(\d{2})/);
                if (dateMatch) setEntryDate(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
           };
           reader.readAsDataURL(item.file);
           
           if (item.analysisCache && item.analysisCache.length > 0) {
               setExtractedResults(item.analysisCache);
               setCurrentResultIndex(0);
               populateFieldsFromData(item.analysisCache[0]);
           }
        }
    }
  }, [activeQueueId, mode]); 

  useEffect(() => {
      if (activeQueueId && loadedFileId === activeQueueId && !isAutoProcessing) {
          const item = queue.find(q => q.id === activeQueueId);
          if (item && item.status === 'pending' && currentLogBase64 && !isDocAnalyzing && (!item.analysisCache || item.analysisCache.length === 0)) {
              if (mode === 'BATCH') {
                 console.log("Auto-triggering MULTI-PAGE PDF analysis for:", item.file.name);
                 handleDocAnalyze();
              } 
          }
      }
  }, [activeQueueId, loadedFileId, currentLogBase64, isDocAnalyzing, mode, isAutoProcessing]);

  // ... (handleBatchUpload, removeFromQueue, handlePhotoUpload, handleVideoUpload, createEntryFromState, handleSave) ...
  // These are identical to previous version but now utilise the updated context.
  
  // Duplicating existing critical handlers to ensure full file integrity in the response
  
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const newItems: QueueItem[] = files.map(file => ({
        id: `FILE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        isPdf: file.type === 'application/pdf',
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
        teamsRegistered: []
      }));
      setQueue(prev => [...prev, ...newItems]);
      if (!activeQueueId && newItems.length > 0) setActiveQueueId(newItems[0].id);
    }
  };

  const removeFromQueue = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); 
    e?.nativeEvent.stopImmediatePropagation();
    if (confirm("이 파일을 작업 목록에서 제거하시겠습니까?")) {
        const newQueue = queue.filter(item => item.id !== id);
        setQueue(newQueue);
        if (sidebarInputRef.current) sidebarInputRef.current.value = '';
        
        if (activeQueueId === id) {
            setActiveQueueId(newQueue.length > 0 ? newQueue[0].id : null);
            if (newQueue.length === 0) {
                resetFormFields();
                setCurrentLogBase64(null);
                setLoadedFileId(null);
            }
        }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressedBase64 = await compressImage(file);
        setTbmPhotoFile(file);
        setTbmPhotoPreview(compressedBase64); 
        setCurrentLogBase64(compressedBase64); 
      } catch (err) { alert("이미지 처리 중 오류가 발생했습니다."); }
    }
  };
  
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTbmVideoFile(file);
      setTbmVideoPreview(URL.createObjectURL(file));
      setTbmVideoFileName(file.name);
      setVideoAnalysis(null); setIsEditingAnalysis(false); setVideoStatusMessage('');
    }
  };

  const createEntryFromState = (currentExtractedData: ExtractedTBMData | null, overrideTeamName?: string, uniqueIndex: number = 0, overrideImage?: string): TBMEntry => {
      const isBatchMode = !!currentExtractedData;
      const dataToUse = isBatchMode ? {
          leaderName: currentExtractedData.leaderName,
          attendeesCount: currentExtractedData.attendeesCount,
          workDescription: currentExtractedData.workDescription,
          riskFactors: currentExtractedData.riskFactors || [],
          safetyFeedback: currentExtractedData.safetyFeedback || [],
          teamName: currentExtractedData.teamName,
          videoAnalysis: (currentExtractedData as any).videoAnalysis,
          date: currentExtractedData.detectedDate || entryDate 
      } : {
          leaderName, attendeesCount, workDescription, riskFactors, safetyFeedback, 
          teamName: teams.find(t=>t.id===teamId)?.name || '알수없음',
          videoAnalysis: videoAnalysis,
          date: entryDate
      };

      let finalTeamId = isBatchMode ? '' : teamId;
      if (dataToUse.teamName) {
         const normalizedInput = dataToUse.teamName.replace(/\s+/g, '').toLowerCase();
         const matched = teams.find(t => {
             const normalizedTeam = t.name.replace(/\s+/g, '').toLowerCase();
             return normalizedInput.includes(normalizedTeam) || normalizedTeam.includes(normalizedInput);
         });
         
         if (matched) {
             finalTeamId = matched.id;
             if (isBatchMode) dataToUse.teamName = matched.name;
         }
      }

      const activeItem = queue.find(q => q.id === activeQueueId);
      const isPdf = activeItem?.isPdf;
      
      const finalImage = overrideImage || (tbmPhotoPreview || (!isPdf && currentLogBase64 ? currentLogBase64 : undefined));

      // Default Doc Analysis (Fallback if needed, but analyzeMasterLog logic handles most)
      const docAnalysis: TBMAnalysisResult = {
          score: 85, evaluation: "분석 완료", analysisSource: 'DOCUMENT',
          details: { participation: 'GOOD', voiceClarity: 'CLEAR', ppeStatus: 'GOOD', interaction: true },
          focusAnalysis: { overall: 90, distractedCount: 0, focusZones: { front: 'HIGH', back: 'HIGH', side: 'HIGH' } },
          insight: { mentionedTopics: [], missingTopics: [], suggestion: "" },
          feedback: []
      };

      const finalVideoAnalysis = (isEditingAnalysis && tempAnalysis) 
          ? tempAnalysis 
          : (dataToUse.videoAnalysis || (mode === 'BATCH' ? docAnalysis : undefined)); // Only use docAnalysis as fallback in BATCH mode

      return {
          id: `ENTRY-${Date.now()}-${uniqueIndex}-${Math.random().toString(36).substring(2, 7)}`, 
          date: dataToUse.date, time: entryTime, teamId: finalTeamId || 'unknown-team', teamName: dataToUse.teamName || '팀 미상',
          leaderName: dataToUse.leaderName, attendeesCount: dataToUse.attendeesCount, workDescription: dataToUse.workDescription,
          riskFactors: dataToUse.riskFactors, safetyFeedback: dataToUse.safetyFeedback,
          tbmPhotoUrl: finalImage, tbmVideoUrl: tbmVideoPreview || undefined, tbmVideoFileName: tbmVideoFileName || undefined,
          videoAnalysis: finalVideoAnalysis,
          originalLogImageUrl: finalImage,
          originalLogMimeType: isPdf ? 'application/pdf' : 'image/jpeg',
          createdAt: Date.now() + uniqueIndex,
      };
  };

  const handleSave = async (action: 'next_team' | 'finish_doc' | 'save_all', forceExit: boolean = false) => {
    // [GUARD] Block saving if analysis is in progress
    if (isDocAnalyzing || isVideoAnalyzing) {
        alert("⚠ AI 분석이 진행 중입니다. 잠시만 기다려주세요.");
        return;
    }

    if (!tbmPhotoPreview && !currentLogBase64 && extractedResults.length === 0) {
      alert("⚠ TBM 증빙 자료가 없습니다.");
      return;
    }

    setIsSaving(true); // START SAVE

    // [FIX] Sync current edits to extractedResults before saving all
    if (action === 'save_all') {
        syncCurrentToExtracted();
    }

    const currentTeamName = teams.find(t => t.id === teamId)?.name || '알 수 없음';
    
    // ... (Existing Batch Save Logic) ...
    if (action === 'save_all' && extractedResults.length > 0) {
        if (!confirm(`총 ${extractedResults.length}개 팀의 데이터를 일괄 저장하시겠습니까?`)) {
            setIsSaving(false);
            return;
        }
        
        try {
            const activeItem = queue.find(q => q.id === activeQueueId);
            let optimizedImage: string | undefined = undefined;
            
            if (activeItem && !activeItem.isPdf && currentLogBase64) {
               console.log("Optimizing image for batch save...");
               optimizedImage = await resizeBase64Image(currentLogBase64, 400, 0.5);
            }

            const batchEntries: TBMEntry[] = [];
            
            for (let index = 0; index < extractedResults.length; index++) {
                const data = extractedResults[index];
                let entryData = { ...data };
                if (index === currentResultIndex) {
                    const currentTeamOption = teams.find(t => t.id === teamId);
                    entryData = { 
                        ...data, 
                        leaderName, 
                        attendeesCount, 
                        workDescription, 
                        riskFactors, 
                        safetyFeedback,
                        teamName: currentTeamOption ? currentTeamOption.name : data.teamName,
                        detectedDate: entryDate !== data.detectedDate ? entryDate : data.detectedDate
                    };
                }
                const entry = createEntryFromState(entryData, undefined, index, optimizedImage);
                batchEntries.push(entry);
            }

            let success = onSave(batchEntries, false);

            if (!success) {
                console.warn("Storage Full. Retrying batch without images...");
                const textOnlyEntries = batchEntries.map(e => ({
                    ...e,
                    tbmPhotoUrl: undefined,
                    originalLogImageUrl: undefined,
                    workDescription: (e.workDescription || "") + " (이미지 생략됨)"
                }));
                success = onSave(textOnlyEntries, false);
            }

            if (success) {
                setIsDirty(false); // Clean state
                const currentIndex = queue.findIndex(q => q.id === activeQueueId);
                const savedTeamNames = batchEntries.map(e => e.teamName);
                
                setQueue(prevQueue => prevQueue.map(q => {
                    if (q.id === activeQueueId) return { ...q, teamsRegistered: [...q.teamsRegistered, ...savedTeamNames], status: 'done', savedFormData: undefined };
                    return q;
                }));
                
                const nextItem = queue.slice(currentIndex + 1).find(q => q.status !== 'done');
                alert(`✅ 저장 완료. 다음 문서로 이동합니다.`);
                
                setCurrentLogBase64(null);
                setLoadedFileId(null);
                setExtractedResults([]);
                setVideoAnalysis(null);
                setTbmPhotoPreview(null);
                
                setTimeout(() => {
                    if (nextItem) setActiveQueueId(nextItem.id);
                    else {
                        setActiveQueueId(null);
                        alert("🎉 모든 문서 처리가 완료되었습니다!");
                    }
                }, 300);
            } else {
                throw new Error("Critical Storage Failure");
            }
        } catch (e: any) { 
            console.error(e); 
            alert("저장 중 시스템 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
        return;
    }

    // ... (Single Entry Save Logic with Fallback) ...
    const newEntry = createEntryFromState(null);
    let success = onSave(newEntry, !!initialData || forceExit);
    
    // [ENHANCED] Retry with text-only if full save fails
    if (!success) {
        if (confirm("저장 공간이 부족합니다. 이미지를 제외하고 텍스트 데이터만 저장하시겠습니까?")) {
             const textOnlyEntry = { ...newEntry, tbmPhotoUrl: undefined, originalLogImageUrl: undefined };
             success = onSave(textOnlyEntry, !!initialData || forceExit);
             if (!success) {
                 alert("텍스트 저장에도 실패했습니다. 데이터를 백업하고 공간을 확보하세요.");
                 setIsSaving(false);
                 return;
             }
        } else {
            setIsSaving(false);
            return;
        }
    }
    
    setIsDirty(false); // Saved successfully
    setIsSaving(false);

    if (initialData || forceExit) return;

    setTimeout(() => {
        const currentIndex = queue.findIndex(q => q.id === activeQueueId);
        let nextIdToActivate: string | null = null;
        if (action === 'finish_doc') {
           const forwardCandidate = queue.slice(currentIndex + 1).find(q => q.status !== 'done');
           if (forwardCandidate) nextIdToActivate = forwardCandidate.id;
        }
        setQueue(prevQueue => prevQueue.map(q => {
                if (q.id === activeQueueId) return { ...q, teamsRegistered: [...q.teamsRegistered, currentTeamName], status: action === 'finish_doc' ? 'done' : 'processing', savedFormData: action === 'next_team' ? getCurrentFormState() : undefined };
                return q;
        }));
        
        if (action === 'next_team') {
            alert(`✅ [${currentTeamName}] 저장 완료! 다음 팀을 선택하세요.`);
            if (extractedResults.length > 0 && currentResultIndex < extractedResults.length - 1) handleSelectExtractedResult(currentResultIndex + 1);
        } else {
            setCurrentLogBase64(null);
            setLoadedFileId(null);
            setExtractedResults([]);
            setVideoAnalysis(null);
            setTbmPhotoPreview(null);
            
            if (nextIdToActivate) setTimeout(() => setActiveQueueId(nextIdToActivate), 100); 
            else {
               setActiveQueueId(null);
               alert(`✅ 작업 완료!`);
            }
        }
    }, 100); 
  };

  // ... (JSX Return) ...
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#F8FAFC] flex flex-col animate-fade-in text-slate-800 font-sans">
        {/* ... (Header and layout code remains exactly the same as previous) ... */}
        {/* Top Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm shrink-0 z-50">
           <div className="flex items-center gap-2 md:gap-4">
              <button onClick={handleSafeCancel} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold transition-colors">
                 <ArrowLeft size={20} />
                 <span className="hidden md:inline">메인으로 나가기</span>
              </button>
              <div className="hidden md:block h-6 w-px bg-slate-200"></div>
              <h1 className="text-sm md:text-lg font-black text-slate-800 flex items-center gap-2 truncate">
                 <Layers className={mode === 'BATCH' ? "text-indigo-600" : "text-emerald-600"} size={18} /> 
                 <span className="truncate">{mode === 'BATCH' ? '종합 일지 작업실' : '정밀 분석 등록'}</span>
              </h1>
              <button onClick={() => setShowGuide(true)} className="ml-1 md:ml-2 text-slate-400 hover:text-blue-600" title="가이드"><HelpCircle size={20} /></button>
           </div>
           
           <div className="flex items-center gap-2 md:gap-3">
              {initialData && onDelete && (
                  <button 
                      onClick={() => onDelete(String(initialData.id))} 
                      className="bg-white border border-red-200 text-red-500 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors flex items-center gap-1.5"
                  >
                      <Trash2 size={16} /> <span className="hidden md:inline">삭제</span>
                  </button>
              )}

              <div className="hidden md:flex text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full items-center gap-2">
                 <span>진행 현황:</span>
                 <span className="text-blue-600">{queue.filter(q => q.status === 'done').length}</span>
                 <span>/ {queue.length}</span>
              </div>
              <button onClick={() => handleSave('finish_doc', true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-50" disabled={isSaving || isDocAnalyzing}>
                  {isSaving ? '저장 중...' : '종료'}
              </button>
           </div>
        </div>

        {/* ... (Rest of layout logic identical to previous, ensuring children are rendered) ... */}
        {activeQueueId && !showGuide && (
            <div className="flex lg:hidden bg-white border-b border-slate-200 sticky top-0 z-40">
                <button onClick={() => setActiveMobileTab('queue')} className={`flex-1 py-3 text-xs font-bold border-b-2 ${activeMobileTab === 'queue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>파일 목록</button>
                <button onClick={() => setActiveMobileTab('preview')} className={`flex-1 py-3 text-xs font-bold border-b-2 ${activeMobileTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>미리보기</button>
                <button onClick={() => setActiveMobileTab('form')} className={`flex-1 py-3 text-xs font-bold border-b-2 ${activeMobileTab === 'form' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>작성하기</button>
            </div>
        )}

        {showGuide ? (
            <GuideScreen mode={mode as 'BATCH' | 'ROUTINE'} onStart={() => setShowGuide(false)} />
        ) : (
            <div className="flex-1 flex overflow-hidden relative">
               {/* 1. Sidebar Queue */}
               <div className={`w-full lg:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 z-40 ${activeMobileTab === 'queue' || !activeQueueId ? 'block' : 'hidden lg:flex'}`}>
                   {/* ... Queue Logic ... */}
                   <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
                    {mode === 'BATCH' && queue.filter(q => q.status === 'pending').length > 0 && (
                        <button 
                            onClick={handleAutoProcessQueue}
                            disabled={isAutoProcessing}
                            className={`w-full py-3 border rounded-xl font-bold text-xs transition-colors flex flex-col items-center justify-center gap-1 shadow-lg ${isAutoProcessing ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white hover:shadow-blue-200/50'}`}
                        >
                            <span className="flex items-center gap-1.5"><Rocket size={14} className={isAutoProcessing ? "animate-pulse" : ""} /> {isAutoProcessing ? '자동 처리 중...' : '빅데이터 마이닝 (Auto-Pilot)'}</span>
                            <span className="text-[9px] opacity-80 font-normal">통계 데이터만 추출 (No Images)</span>
                        </button>
                    )}
                    <button onClick={() => sidebarInputRef.current?.click()} className={`w-full py-3 border rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${mode === 'BATCH' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
                        <Plus size={16} /> 파일 추가
                    </button>
                    <input ref={sidebarInputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleBatchUpload}/>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {queue.length === 0 && <div className="text-center py-10 text-slate-400"><p className="text-xs">등록된 파일이 없습니다.</p></div>}
                    {queue.map((item, idx) => (
                        <div key={item.id} onClick={() => { !isAutoProcessing && setActiveQueueId(item.id); setActiveMobileTab('preview'); }} className={`relative p-3 rounded-xl cursor-pointer border transition-all ${activeQueueId === item.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'} ${item.status === 'error' ? 'border-red-300 bg-red-50' : ''}`}>
                        <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center relative">
                                    {item.isPdf ? <FileText size={16}/> : <img src={item.previewUrl || ''} className="w-full h-full object-cover"/>}
                                    {item.status === 'done' && (
                                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                            <CheckCircle2 size={12} className="text-green-700 bg-white rounded-full"/>
                                        </div>
                                    )}
                                    {item.status === 'processing' && (
                                        <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center backdrop-blur-[1px]">
                                            <Loader2 size={16} className="text-white animate-spin"/>
                                        </div>
                                    )}
                                    {item.status === 'error' && (
                                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                            <AlertTriangle size={12} className="text-red-600 bg-white rounded-full"/>
                                        </div>
                                    )}
                            </div>
                            <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{item.file.name}</p><span className="text-[10px] text-slate-400">{item.status}</span></div>
                        </div>
                        <button 
                            onClick={(e) => removeFromQueue(item.id, e)} 
                            className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors z-10"
                            type="button"
                            disabled={isAutoProcessing}
                        >
                            <Trash2 size={14}/>
                        </button>
                        </div>
                    ))}
                </div>
               </div>

               {activeQueueId ? (
                   <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                       {/* 2. Viewer */}
                       <div className={`flex-1 bg-slate-900 relative flex-col overflow-hidden ${activeMobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
                           {/* ... Viewer Content ... */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl">
                                <button onClick={() => { setViewerMode('fit'); setImgScale(1); }} className="p-2 rounded-lg text-xs font-bold bg-blue-600 text-white"><Minimize size={14}/> 전체</button>
                                <button onClick={() => { setViewerMode('scroll'); setImgScale(1.5); }} className="p-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-700"><Maximize size={14}/></button>
                                <button onClick={() => setImgRotation(r => (r + 90) % 360)} className="p-2 hover:bg-slate-700 text-white rounded-lg"><RotateCw size={16}/></button>
                            </div>
                            <div className="flex-1 overflow-auto flex items-center justify-center p-4 md:p-8 custom-scrollbar bg-slate-900">
                                {queue.find(q => q.id === activeQueueId)?.isPdf ? 
                                <object data={queue.find(q => q.id === activeQueueId)?.previewUrl!} type="application/pdf" className="w-full h-full min-h-[400px] md:min-h-[800px] shadow-2xl rounded-lg bg-white"/> : 
                                <div style={{ transform: `rotate(${imgRotation}deg)`, width: viewerMode === 'fit' ? 'auto' : `${imgScale * 100}%`, height: viewerMode === 'fit' ? '100%' : 'auto' }} className="relative transition-transform duration-200 ease-out origin-center">
                                    <img src={queue.find(q => q.id === activeQueueId)?.previewUrl!} className={`rounded bg-white ${viewerMode === 'fit' ? 'max-w-full max-h-full object-contain' : 'w-full h-auto'}`}/>
                                </div>
                                }
                            </div>
                       </div>

                       {/* 3. Form */}
                       <div className={`w-full lg:w-[480px] bg-white border-l border-slate-200 flex-col h-full shadow-2xl z-30 relative ${activeMobileTab === 'form' ? 'flex' : 'hidden lg:flex'}`}>
                           {/* ... Form Content ... */}
                           {isAutoProcessing && (
                                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                    <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
                                        <Rocket size={48} className="text-blue-600 animate-bounce" />
                                        <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-ping"></div>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-2">빅데이터 마이닝 중...</h3>
                                    <p className="text-sm text-slate-500 font-bold mb-6">종합 일지에서 연구용 데이터를 추출하고 있습니다.<br/>(저장 공간 확보를 위해 이미지는 자동 제외됩니다)</p>
                                    
                                    <div className="w-full max-w-xs bg-slate-100 rounded-full h-4 mb-3 overflow-hidden">
                                        <div 
                                            className="bg-blue-600 h-full transition-all duration-300 ease-out" 
                                            style={{ width: `${(autoProcessStats.currentFileIndex / Math.max(autoProcessStats.totalFiles, 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between w-full max-w-xs text-xs font-bold text-slate-500">
                                        <span>파일 {autoProcessStats.currentFileIndex} / {autoProcessStats.totalFiles}</span>
                                        <span>누적 {autoProcessStats.totalTeamsSaved}개 팀 등록</span>
                                    </div>
                                </div>
                            )}
                            <div className="p-5 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm shrink-0">
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <label className="text-[11px] font-bold text-slate-500 mb-1 block uppercase">등록할 팀 선택</label>
                                        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                                            {teams.map(t => {
                                            const isDone = queue.find(q => q.id === activeQueueId)?.teamsRegistered.includes(t.name);
                                            return <option key={t.id} value={t.id} disabled={isDone} className={isDone ? "text-slate-300" : ""}>{t.name} {isDone ? '(완료)' : ''}</option>;
                                            })}
                                        </select>
                                    </div>
                                    
                                    <button onClick={handleDocAnalyze} disabled={isDocAnalyzing || isVideoAnalyzing} className={`h-[46px] text-white px-4 rounded-lg font-bold transition-all shadow-md flex items-center gap-2 shrink-0 text-xs ${activeQueueId ? 'bg-gradient-to-r from-indigo-600 to-violet-600' : 'bg-slate-900'}`}>
                                        {isDocAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} 
                                        {isDocAnalyzing ? '분석 중...' : '문서 식별'}
                                    </button>
                                </div>

                                {(isDocAnalyzing || isVideoAnalyzing) && videoStatusMessage && (
                                    <div className="mt-2 text-center">
                                        <p className="text-[10px] font-bold text-indigo-600 animate-pulse bg-indigo-50 py-1 rounded">{videoStatusMessage}</p>
                                    </div>
                                )}

                                {extractedResults.length > 0 && mode === 'BATCH' && (
                                    <div className="mt-3 overflow-x-auto pb-1 custom-scrollbar">
                                        <div className="flex gap-2">
                                            {extractedResults.map((result, idx) => (
                                                <button key={idx} onClick={() => handleSelectExtractedResult(idx)} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${currentResultIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                    {result.teamName || `Team ${idx + 1}`}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-indigo-600 font-bold mt-1.5 px-1 bg-indigo-50 inline-block rounded p-1">
                                            ✨ {extractedResults.length}개 팀 식별 완료
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar pb-24">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                                            일자 {isDateFromAI && <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Sparkles size={8}/> AI 추출</span>}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="date" 
                                                value={entryDate} 
                                                onChange={(e)=>{
                                                    setEntryDate(e.target.value);
                                                    setIsDateFromAI(false); // Reset if manually changed
                                                }} 
                                                className={`w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 ${isDateFromAI ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-300'}`}
                                            />
                                            {isDateFromAI && <div className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"><Check size={14}/></div>}
                                        </div>
                                    </div>
                                    <div><label className="text-[11px] font-bold text-slate-500 mb-1 block">시간</label><input type="time" value={entryTime} onChange={(e)=>setEntryTime(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold bg-slate-50"/></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[11px] font-bold text-slate-500 mb-1 block">팀장명</label><input type="text" value={leaderName} onChange={(e)=>setLeaderName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold"/></div>
                                    <div><label className="text-[11px] font-bold text-slate-500 mb-1 block">참석 인원</label><input type="number" value={attendeesCount} onChange={(e)=>setAttendeesCount(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold"/></div>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">작업 내용</label>
                                    <textarea value={workDescription} onChange={(e)=>setWorkDescription(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:border-blue-500 outline-none min-h-[80px] resize-none" placeholder="작업 내용을 입력하세요."/>
                                </div>
                                
                                <div className="bg-orange-50/50 rounded-xl border border-orange-100 p-3">
                                    <div className="flex justify-between items-center mb-2"><h4 className="text-[11px] font-bold text-orange-700 flex items-center gap-1"><AlertTriangle size={12}/> 중점 위험 요인</h4><button onClick={addRiskFactor} className="text-[10px] bg-white border px-2 py-0.5 rounded">+ 행 추가</button></div>
                                    <div className="space-y-2">{(riskFactors || []).map((r, i) => (<div key={i} className="bg-white p-2 rounded border flex flex-col gap-1"><input value={r.risk} onChange={(e)=>handleRiskChange(i, 'risk', e.target.value)} className="border-b border-dashed outline-none text-xs"/><input value={r.measure} onChange={(e)=>handleRiskChange(i, 'measure', e.target.value)} className="border-b border-dashed outline-none text-xs"/></div>))}</div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[11px] font-bold text-slate-500 block">TBM 사진/일지 ({mode === 'ROUTINE' ? '필수' : '선택'})</label>
                                            {tbmPhotoPreview ? (
                                            <div className="relative aspect-video rounded-lg overflow-hidden border">
                                                <img src={tbmPhotoPreview} className="w-full h-full object-cover"/>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTbmPhotoPreview(null);
                                                        setTbmPhotoFile(null);
                                                        if (photoInputRef.current) photoInputRef.current.value = '';
                                                    }} 
                                                    type="button"
                                                    className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors z-10 cursor-pointer"
                                                >
                                                    <X size={14}/>
                                                </button>
                                            </div>
                                            ) : (
                                            <div onClick={()=>photoInputRef.current?.click()} className="w-full aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                                                <div className="flex flex-col items-center gap-1 text-slate-300">
                                                    <Camera size={24} />
                                                    <span className="text-[10px] font-bold">사진 촬영/업로드</span>
                                                </div>
                                            </div>
                                            )}
                                            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[11px] font-bold text-slate-500 block">동영상 (선택)</label>
                                            {tbmVideoPreview ? 
                                                <div className="flex flex-col gap-2">
                                                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-black">
                                                        <video src={tbmVideoPreview} className="w-full h-full object-contain" controls/>
                                                        <button onClick={()=>{setTbmVideoPreview(null); setVideoAnalysis(null); setIsVideoAnalyzing(false);}} className="absolute top-1 right-1 bg-white/20 text-white p-1 rounded-full z-10 hover:bg-red-500 transition-colors"><X size={12}/></button>
                                                    </div>
                                                    <button 
                                                        onClick={handleVideoAnalyze}
                                                        disabled={isVideoAnalyzing} 
                                                        className="w-full bg-violet-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-violet-700 transition-colors shadow-md flex items-center justify-center gap-2"
                                                    >
                                                        {isVideoAnalyzing ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} className="text-yellow-300"/>}
                                                        {isVideoAnalyzing ? "영상 정밀 분석 중..." : "✨ AI 영상 정밀 진단 시작"}
                                                    </button>
                                                </div>
                                                : <div onClick={()=>videoInputRef.current?.click()} className="w-full aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                                                    <div className="flex flex-col items-center gap-1 text-slate-300">
                                                        <Film size={24} />
                                                        <span className="text-[10px] font-bold">동영상 업로드</span>
                                                    </div>
                                                </div>
                                            }
                                            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Footer Actions */}
                            <div className="p-4 border-t border-slate-200 bg-white absolute bottom-0 left-0 right-0 z-10 flex gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                            {!initialData ? (
                                <>
                                    {mode === 'BATCH' && extractedResults.length > 0 ? (
                                        <button onClick={() => handleSave('save_all')} disabled={isDocAnalyzing || isSaving} className="flex-[2] bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-sm flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50">
                                        <span className="flex items-center gap-1"><Copy size={16}/> {isSaving ? '저장 중...' : `${extractedResults.length}개 팀 일괄 저장`}</span>
                                        <span className="text-[10px] opacity-80 font-normal">자동으로 다음 문서 이동</span>
                                        </button>
                                    ) : (
                                        <button onClick={() => handleSave('finish_doc')} disabled={isDocAnalyzing || isSaving} className="flex-[1] bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-lg text-sm flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50">
                                        <span className="flex items-center gap-1"><Check size={16}/> {isSaving ? '저장 중...' : '저장 및 완료'}</span>
                                        {mode === 'BATCH' && <span className="text-[10px] opacity-80 font-normal">다음 파일로 이동</span>}
                                        </button>
                                    )}
                                    
                                    {mode === 'BATCH' && extractedResults.length === 0 && (
                                        <button onClick={() => handleSave('next_team')} disabled={isDocAnalyzing || isSaving} className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-50 transition-colors text-xs flex flex-col items-center justify-center leading-none gap-1 disabled:opacity-50">
                                            <span className="flex items-center gap-1"><Plus size={14}/> 현재 문서에 팀 추가</span>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button onClick={() => handleSave('finish_doc')} disabled={isDocAnalyzing || isSaving} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                    <Save size={16}/> {isSaving ? '저장 중...' : '수정 내용 저장'}
                                </button>
                            )}
                            </div>
                       </div>
                   </div>
               ) : (
                   /* Empty State */
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-10 animate-fade-in text-center">
                        <button onClick={() => sidebarInputRef.current?.click()} className={`px-8 py-4 text-white rounded-2xl font-bold hover:shadow-xl hover:scale-105 transition-all shadow-lg flex items-center gap-3 text-sm ${mode === 'BATCH' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
                            <Plus size={20}/> 파일 불러오기
                        </button>
                    </div>
               )}
            </div>
        )}

      {/* Show Help Modals */}
      {showFeedbackModal && createPortal(<div className="fixed inset-0 z-[99999] bg-black/50 p-4 flex items-center justify-center"><div className="bg-white p-4 rounded-xl w-full max-w-lg h-[80vh] overflow-y-auto"><h3 className="font-bold mb-4">안전 가이드라인 선택</h3>{monthlyGuidelines.map((g, i)=><div key={i} onClick={()=>{if(!safetyFeedback.includes(g.content)) setSafetyFeedback([...safetyFeedback, g.content]); setShowFeedbackModal(false);}} className="p-3 border-b cursor-pointer hover:bg-slate-50">{g.content}</div>)}<button onClick={()=>setShowFeedbackModal(false)} className="mt-4 w-full p-3 bg-slate-100 rounded-lg">닫기</button></div></div>, document.body)}
      {showHelpModal && createPortal(<div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm p-4 flex items-center justify-center animate-fade-in" onClick={()=>setShowHelpModal(false)}><div className="bg-white p-8 rounded-3xl max-w-lg w-full relative overflow-hidden" onClick={(e) => e.stopPropagation()}>...<button className="w-full bg-slate-900 text-white p-3.5 rounded-xl font-bold mt-8 hover:bg-slate-800 transition-colors shadow-lg" onClick={()=>setShowHelpModal(false)}>확인했습니다</button></div></div>, document.body)}
    </div>,
    document.body
  );
};
