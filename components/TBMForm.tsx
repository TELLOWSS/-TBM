
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TBMEntry, RiskAssessmentItem, SafetyGuideline, TeamOption, TBMAnalysisResult, ExtractedTBMData } from '../types';
import { analyzeMasterLog, evaluateTBMVideo } from '../services/geminiService';
import { compressVideo } from '../utils/videoUtils';
import { GoogleGenAI } from "@google/genai";
import { Upload, Camera, Sparkles, X, Layers, ArrowLeft, Trash2, Film, Save, Plus, Check, BrainCircuit, UserCheck, HelpCircle, FileStack, Database, Rocket, PenTool, MousePointerClick, FileInput, RefreshCw, Users, FileText, ChevronLeft, ChevronRight, ScanLine, AlertCircle, GripHorizontal, Eye, PlayCircle, MessageSquare, ArrowRight, Images, ListOrdered, Forward, Zap, Sliders } from 'lucide-react';

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

// Korean Translation Map for Rubric Keys
const RUBRIC_LABELS: Record<string, string> = {
    logQuality: '일지 충실도 (30)',
    focus: '팀원 집중도 (30)',
    voice: '음성 전달력 (20)',
    ppe: '보호구 상태 (20)',
};

const RUBRIC_MAX: Record<string, number> = {
    logQuality: 30,
    focus: 30,
    voice: 20,
    ppe: 20,
};

// Helper functions
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
};

// [UPDATED] GuideScreen Component with Infographic
const GuideScreen = ({ mode, onStart }: { mode: 'BATCH' | 'ROUTINE', onStart: () => void }) => {
    // ... (No changes to GuideScreen logic, keeping existing)
    return (
        <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 animate-fade-in overflow-y-auto">
            <div className="max-w-5xl w-full">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-xl ${mode === 'BATCH' ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                        {mode === 'BATCH' ? <FileStack size={40} /> : <Camera size={40} />}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-3 tracking-tight">
                        {mode === 'BATCH' ? '종합 일지 빅데이터 마이닝' : '스마트 TBM 개별 등록'}
                    </h2>
                    <p className="text-slate-500 text-sm md:text-base font-medium max-w-2xl mx-auto leading-relaxed">
                        {mode === 'BATCH' 
                            ? "수십 개 팀이 기록된 '일일안전작업종합일지'를 한 번에 처리합니다." 
                            : "팀장님이 작성한 개별 TBM 일지(수기 기록)를 AI가 분석하여 디지털화합니다."}
                    </p>
                </div>

                {/* Infographic Section for Routine Mode */}
                {mode === 'ROUTINE' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative">
                        {/* Connecting Lines (Desktop) */}
                        <div className="hidden md:block absolute top-1/2 left-1/3 w-1/6 h-0.5 bg-slate-200 -translate-y-1/2 -z-0"></div>
                        <div className="hidden md:block absolute top-1/2 right-1/3 w-1/6 h-0.5 bg-slate-200 -translate-y-1/2 -z-0"></div>

                        {/* Step 1 */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-emerald-400 hover:shadow-md transition-all relative z-10">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Images size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">1. 다중 업로드</h3>
                            <p className="text-xs text-slate-500 leading-relaxed word-keep">
                                수기로 작성된 TBM 일지 사진을<br/>
                                <strong className="text-emerald-600">여러 장 한꺼번에</strong> 선택하여 올리세요.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-blue-400 hover:shadow-md transition-all relative z-10">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <ListOrdered size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">2. 대기열(Queue) 관리</h3>
                            <p className="text-xs text-slate-500 leading-relaxed word-keep">
                                업로드된 파일이 하단 대기열에 쌓입니다.<br/>
                                <strong className="text-blue-600">순서대로 하나씩</strong> AI 분석을 진행합니다.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center group hover:border-indigo-400 hover:shadow-md transition-all relative z-10">
                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Forward size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">3. 연속 처리</h3>
                            <p className="text-xs text-slate-500 leading-relaxed word-keep">
                                작성이 끝나면 <strong className="text-indigo-600">'저장 및 다음'</strong> 버튼을 누르세요.<br/>
                                즉시 다음 파일로 넘어가 흐름이 끊기지 않습니다.
                            </p>
                        </div>
                    </div>
                )}

                {/* Infographic Section for Batch Mode */}
                {mode === 'BATCH' && (
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex items-center gap-3 mb-3 justify-center md:justify-start">
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">AI OCR Engine</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">문서 한 장으로 수십 개 팀 처리</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                PDF나 고화질 이미지로 된 '종합 일지'를 업로드하면,<br/>
                                AI가 표(Table) 구조를 인식하여 <strong>팀별 데이터를 자동으로 분할 추출</strong>합니다.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-slate-300">
                            <FileText size={48} className="text-slate-400" />
                            <ArrowRight size={24} className="animate-pulse" />
                            <Database size={48} className="text-indigo-500" />
                        </div>
                    </div>
                )}

                <div className="text-center">
                    <button 
                        onClick={onStart}
                        className={`px-12 py-4 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all text-lg flex items-center gap-3 mx-auto ${mode === 'BATCH' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-emerald-600 shadow-emerald-200'}`}
                    >
                        <Rocket size={22} className="animate-pulse" />
                        <span>지금 시작하기</span>
                    </button>
                    <p className="mt-4 text-xs text-slate-400 font-medium">
                        * AI 분석 서버 최적화로 동영상 분석이 10초 내외로 완료됩니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export const TBMForm: React.FC<TBMFormProps> = ({ onSave, onCancel, monthlyGuidelines, initialData, onDelete, teams, mode = 'ROUTINE' }) => {
  // --- Global State ---
  const [showGuide, setShowGuide] = useState(!initialData);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'queue' | 'form'>('queue');

  // Form Fields
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
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
  
  // Feedback Editing
  const [editingFeedbackIndex, setEditingFeedbackIndex] = useState<number | null>(null);
  const [tempFeedbackText, setTempFeedbackText] = useState("");
  const [newFeedbackInput, setNewFeedbackInput] = useState("");

  // Current Doc Base64
  const [currentLogBase64, setCurrentLogBase64] = useState<string | null>(null);

  // UI State
  const [isDocAnalyzing, setIsDocAnalyzing] = useState(false);
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
  const [isFeedbackGenerating, setIsFeedbackGenerating] = useState(false);

  // Multi-Team Extraction
  const [extractedResults, setExtractedResults] = useState<ExtractedTBMData[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);

  const [isDirty, setIsDirty] = useState(false);

  // Refs
  const queueInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Sync Active Queue Item
  useEffect(() => {
    const syncActiveFile = async () => {
        if (activeQueueId) {
            const item = queue.find(q => q.id === activeQueueId);
            if (item && !item.isPdf) {
                const base64 = await blobToBase64(item.file);
                setCurrentLogBase64(base64);
            } else {
                setCurrentLogBase64(null);
            }
        }
    };
    syncActiveFile();
  }, [activeQueueId, queue]);

  // Initial Data Load
  useEffect(() => {
      if (initialData) {
          setEntryDate(initialData.date);
          setEntryTime(initialData.time);
          setTeamId(initialData.teamId);
          setLeaderName(initialData.leaderName);
          setAttendeesCount(initialData.attendeesCount);
          setWorkDescription(initialData.workDescription);
          setRiskFactors(initialData.riskFactors || []);
          setSafetyFeedback(initialData.safetyFeedback || []);
          setTbmPhotoPreview(initialData.tbmPhotoUrl || null);
          setTbmVideoPreview(initialData.tbmVideoUrl || null);
          setTbmVideoFileName(initialData.tbmVideoFileName || null);
          if (initialData.videoAnalysis) setVideoAnalysis(initialData.videoAnalysis);
          if (initialData.originalLogImageUrl?.startsWith('data:')) setCurrentLogBase64(initialData.originalLogImageUrl);
          setActiveMobileTab('form');
          setIsDirty(false);
      }
  }, [initialData]);

  // Helper: Compress Image (Existing)
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
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0, width, height);
             resolve(canvas.toDataURL('image/jpeg', 0.7));
          } else reject(new Error("Canvas error"));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleSafeCancel = () => {
      if (isDirty && !initialData && !confirm("작성 중인 내용이 있습니다. 나가시겠습니까?")) return;
      onCancel();
  };

  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files: File[] = Array.from(e.target.files);
      const newItems: QueueItem[] = files.map(file => ({
        id: `FILE-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isPdf: file.type === 'application/pdf',
        status: 'pending',
        teamsRegistered: []
      }));
      setQueue(prev => [...prev, ...newItems]);
      if (!activeQueueId && newItems.length > 0) {
        setActiveQueueId(newItems[0].id);
        setActiveMobileTab('queue');
      }
      e.target.value = ''; 
    }
  };

  const handleDocAnalyze = async () => {
    const activeItem = queue.find(q => q.id === activeQueueId);
    if (!activeItem) { alert("분석할 파일이 없습니다."); return; }

    setIsDocAnalyzing(true);
    setVideoStatusMessage("문서 구조 분석 중...");
    
    try {
        const base64Content = await blobToBase64(activeItem.file);
        const base64Data = base64Content.split(',')[1];
        
        const safeMode: 'BATCH' | 'ROUTINE' = (mode === 'BATCH') ? 'BATCH' : 'ROUTINE';
        const results = await analyzeMasterLog(base64Data, activeItem.file.type, monthlyGuidelines, safeMode);
        
        if (results.length === 0) {
            alert("데이터 추출 실패. 이미지가 흐리거나 형식이 맞지 않습니다.");
        } else {
            setExtractedResults(results);
            setCurrentResultIndex(0);
            
            const first = results[0];
            const matched = teams.find(t => t.name.replace(/\s/g,'').includes(first.teamName.replace(/\s/g,'')));
            setTeamId(matched ? matched.id : '');
            setLeaderName(first.leaderName);
            setAttendeesCount(first.attendeesCount);
            setWorkDescription(first.workDescription);
            setRiskFactors(first.riskFactors || []);
            setSafetyFeedback(first.safetyFeedback || []);
            if(first.detectedDate) { setEntryDate(first.detectedDate); }
            if(first.videoAnalysis) setVideoAnalysis(first.videoAnalysis);

            alert(`✅ ${results.length}개 팀 데이터 추출 완료.`);
            setActiveMobileTab('form');
        }
    } catch (e) {
        console.error(e);
        alert("분석 중 오류 발생");
    } finally {
        setIsDocAnalyzing(false);
        setVideoStatusMessage("");
    }
  };

  // --- NEW: Handle Manual Rubric Update ---
  const handleRubricChange = (key: string, value: number) => {
      setVideoAnalysis(prev => {
          if (!prev) return null;
          
          const newRubric = { ...prev.rubric, [key]: value };
          // Calculate new total score
          const totalScore = (newRubric.logQuality || 0) + (newRubric.focus || 0) + (newRubric.voice || 0) + (newRubric.ppe || 0);
          
          return {
              ...prev,
              rubric: newRubric,
              score: totalScore
          };
      });
  };

  // --- NEW: Handle Evaluation Text Update (Fix for Read-only Error Message) ---
  const handleEvaluationChange = (newText: string) => {
      setVideoAnalysis(prev => {
          if (!prev) return null;
          return { ...prev, evaluation: newText };
      });
  };

  // Video Analysis Logic (Triggers AI)
  const handleRunVideoAnalysis = async () => {
    if (!tbmVideoFile) return;
    setIsVideoAnalyzing(true);
    setVideoStatusMessage("AI 고속 압축 분석 중 (3배속)...");

    try {
        const compressedBlob = await compressVideo(tbmVideoFile);
        const base64Video = await blobToBase64(compressedBlob);
        
        const result = await evaluateTBMVideo(
            base64Video.split(',')[1],
            'video/mp4',
            { workDescription, riskFactors },
            monthlyGuidelines
        );

        if (result.score === 0 || result.evaluation.includes("분석 실패")) {
            // [FIX] Even on soft failure, we use the result object so the UI becomes editable
            // Throwing error would trigger the catch block which does the same fallback
            // But if the server returns a specific error message in evaluation, we want to show it.
            setVideoAnalysis(result); 
            // alert("AI 분석 지연 또는 오류가 발생했습니다. 직접 점수와 내용을 수정해주세요.");
        } else {
            setVideoAnalysis(result);
            if (result.feedback && result.feedback.length > 0) {
                const currentFeedback = [...safetyFeedback];
                result.feedback.forEach(fb => {
                    if (!currentFeedback.includes(fb)) currentFeedback.push(fb);
                });
                setSafetyFeedback(currentFeedback);
            }
            alert("AI 분석이 완료되었습니다. 결과 점수를 수정할 수 있습니다.");
        }
        
    } catch (e) {
        console.error(e);
        alert("AI 분석에 실패했습니다. 수동 채점 모드로 전환합니다.");
        
        // [FAILSAFE] Initialize Editable Template on Failure
        setVideoAnalysis({
            score: 0,
            evaluation: "AI 분석 실패 (네트워크/시간초과). 아래 내용을 직접 수정하여 평가를 완료해주세요.",
            analysisSource: 'VIDEO',
            rubric: { logQuality: 0, focus: 0, voice: 0, ppe: 0, deductions: [] },
            details: { participation: 'MODERATE', voiceClarity: 'MUFFLED', ppeStatus: 'BAD', interaction: false },
            focusAnalysis: { overall: 0, distractedCount: 0, focusZones: { front: 'LOW', back: 'LOW', side: 'LOW' } },
            insight: { mentionedTopics: [], missingTopics: [], suggestion: "" },
            feedback: []
        });
        
    } finally {
        setIsVideoAnalyzing(false);
        setVideoStatusMessage("");
    }
  };

  // ... (Other handlers like handleTextGapAnalysis, handleSaveAndNext match existing code) ...
  const handleTextGapAnalysis = async () => {
    if (!workDescription) { alert("작업 내용을 먼저 입력해주세요."); return; }
    setIsFeedbackGenerating(true);
    try {
        const apiKey = process.env.API_KEY || '';
        const ai = new GoogleGenAI({ apiKey });
        const guidelinesText = monthlyGuidelines.map(g => `- [${g.category}] ${g.content} (${g.level === 'HIGH' ? '중점' : '일반'})`).join('\n');
        const risksText = riskFactors.map(r => `${r.risk}`).join(', ');
        const prompt = `Role: Safety Manager. Task: Compare [Work] vs [Rules]. [Work]: ${workDescription} [Risks]: ${risksText} [Rules]: ${guidelinesText} Output: JSON array of Korean strings (feedback). If risk missing for rules, say "월간 중점 사항인 [Guideline] 내용이 누락되었습니다.".`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { responseMimeType: 'application/json', temperature: 0.2 } });
        if (response.text) {
            const newFeedback = JSON.parse(response.text);
            if (Array.isArray(newFeedback)) {
                setSafetyFeedback(prev => { const unique = new Set([...prev, ...newFeedback]); return Array.from(unique); });
            }
        }
    } catch (e) { console.error(e); } finally { setIsFeedbackGenerating(false); }
  };

  const handleAddFeedback = () => { if (newFeedbackInput.trim()) { setSafetyFeedback([...safetyFeedback, newFeedbackInput.trim()]); setNewFeedbackInput(""); } };
  const handleDeleteFeedback = (index: number) => { setSafetyFeedback(safetyFeedback.filter((_, i) => i !== index)); };
  const handleStartEditFeedback = (index: number) => { setEditingFeedbackIndex(index); setTempFeedbackText(safetyFeedback[index]); };
  const handleSaveEditFeedback = () => { if (editingFeedbackIndex !== null) { const updated = [...safetyFeedback]; updated[editingFeedbackIndex] = tempFeedbackText; setSafetyFeedback(updated); setEditingFeedbackIndex(null); } };
  const addRiskFactor = () => setRiskFactors([...riskFactors, { risk: '', measure: '' }]);
  const handleRiskChange = (i:number, f:any, v:string) => { const n=[...riskFactors]; n[i][f]=v; setRiskFactors(n); };
  const handlePhotoUpload = async (e:any) => { if(e.target.files?.[0]) { const f=e.target.files[0]; const b=await compressImage(f); setTbmPhotoFile(f); setTbmPhotoPreview(b); }};
  const handleVideoUpload = (e:any) => { if(e.target.files?.[0]) { const f=e.target.files[0]; setTbmVideoFile(f); setTbmVideoFileName(f.name); setTbmVideoPreview(URL.createObjectURL(f)); }};

  const handleSaveAndNext = () => {
      if(!tbmPhotoPreview && !currentLogBase64 && !initialData) { alert("증빙 자료(사진/일지)가 필요합니다."); return; }
      const entry: TBMEntry = {
          id: initialData?.id || `ENTRY-${Date.now()}`,
          date: entryDate, time: entryTime, teamId, 
          teamName: teams.find(t=>t.id===teamId)?.name || 'Unknown',
          leaderName, attendeesCount, workDescription, riskFactors, safetyFeedback,
          tbmPhotoUrl: tbmPhotoPreview || undefined,
          videoAnalysis: videoAnalysis || undefined,
          originalLogImageUrl: currentLogBase64 || undefined,
          tbmVideoFileName: tbmVideoFileName || (initialData?.tbmVideoFileName) || undefined,
          tbmVideoUrl: tbmVideoPreview || undefined, 
          createdAt: Date.now()
      };
      onSave(entry, false);
      if (queue.length > 0 && activeQueueId) {
          const nextQueue = queue.filter(q => q.id !== activeQueueId);
          setQueue(nextQueue);
          if (nextQueue.length > 0) {
              const nextItem = nextQueue[0];
              setActiveQueueId(nextItem.id);
              setExtractedResults([]);
              setVideoAnalysis(null);
              setRiskFactors([]);
              setSafetyFeedback([]);
              setWorkDescription('');
              setTeamId(''); 
              setTbmPhotoFile(null);
              setTbmPhotoPreview(null);
              setTbmVideoFile(null);
              setTbmVideoPreview(null);
              setTbmVideoFileName(null);
              alert("✅ 저장되었습니다. 다음 파일로 이동합니다.");
          } else {
              alert("✅ 모든 대기열 처리가 완료되었습니다.");
              onCancel(); 
          }
      } else {
          alert("저장되었습니다.");
          onCancel();
      }
  };

  const handleSaveOnly = () => {
       if(!tbmPhotoPreview && !currentLogBase64 && !initialData) { alert("증빙 자료가 필요합니다."); return; }
       const entry: TBMEntry = {
          id: initialData?.id || `ENTRY-${Date.now()}`,
          date: entryDate, time: entryTime, teamId, 
          teamName: teams.find(t=>t.id===teamId)?.name || 'Unknown',
          leaderName, attendeesCount, workDescription, riskFactors, safetyFeedback,
          tbmPhotoUrl: tbmPhotoPreview || undefined,
          videoAnalysis: videoAnalysis || undefined,
          originalLogImageUrl: currentLogBase64 || undefined,
          tbmVideoFileName: tbmVideoFileName || (initialData?.tbmVideoFileName) || undefined,
          tbmVideoUrl: tbmVideoPreview || undefined, 
          createdAt: Date.now()
      };
      if(onSave(entry, true)) alert("저장되었습니다.");
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#F8FAFC] flex flex-col animate-fade-in text-slate-800 font-sans">
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
                 <span className="truncate">{mode === 'BATCH' ? '종합 일지 작업실' : '개별 등록'}</span>
              </h1>
           </div>
           <div className="flex items-center gap-2">
              {initialData && onDelete && (
                  <button onClick={() => onDelete(String(initialData.id))} className="bg-white border border-red-200 text-red-500 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-1">
                      <Trash2 size={16} /> 삭제
                  </button>
              )}
              {queue.length > 0 ? (
                  <button onClick={handleSaveAndNext} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-lg shadow-indigo-200">
                      <Save size={16}/> 저장 및 다음 ({queue.length}) <ArrowRight size={14}/>
                  </button>
              ) : (
                  <button onClick={handleSaveOnly} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700">
                      <Save size={16} className="inline mr-1"/> 저장 및 종료
                  </button>
              )}
           </div>
        </div>

        {showGuide ? (
            <GuideScreen mode={mode as 'BATCH' | 'ROUTINE'} onStart={() => { setShowGuide(false); setActiveMobileTab(mode === 'BATCH' ? 'queue' : 'form'); }} />
        ) : (
            <div className="flex-1 flex overflow-hidden relative">
               {/* LEFT PANE: Queue & Viewer (Hidden on mobile if tab != queue) */}
               <div className={`flex-1 bg-slate-100 flex flex-col relative border-r border-slate-200 ${activeMobileTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
                   {queue.length === 0 ? (
                       <div className="flex-1 flex flex-col items-center justify-center p-8 m-4 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50 text-slate-400">
                           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                               <Upload size={32} className="text-slate-300"/>
                           </div>
                           <h3 className="font-bold text-lg text-slate-600 mb-2">파일을 업로드하세요</h3>
                           <p className="text-sm text-center mb-6 max-w-xs">종합 일지(PDF) 또는 사진(JPG)을 드래그하거나 아래 버튼을 눌러 추가하세요.</p>
                           <input type="file" multiple ref={queueInputRef} className="hidden" onChange={handleBatchUpload} accept="image/*,application/pdf"/>
                           <button onClick={() => queueInputRef.current?.click()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                               파일 선택하기
                           </button>
                       </div>
                   ) : (
                       <div className="flex-1 flex flex-col h-full">
                           {/* Active Item Viewer */}
                           <div className="flex-1 bg-slate-800 relative overflow-hidden flex items-center justify-center">
                               {queue.find(q=>q.id===activeQueueId)?.previewUrl ? (
                                   <div className="relative w-full h-full flex items-center justify-center">
                                       <img src={queue.find(q=>q.id===activeQueueId)!.previewUrl!} className="max-w-full max-h-full object-contain" />
                                       
                                       {/* Analyze Overlay Button */}
                                       {!isDocAnalyzing && extractedResults.length === 0 && (
                                           <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                                               <button onClick={handleDocAnalyze} className="bg-white/90 backdrop-blur text-indigo-600 px-6 py-3 rounded-full font-black shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 border-2 border-indigo-100">
                                                   <Sparkles size={20} className="animate-pulse"/> AI 문서 분석 시작
                                               </button>
                                           </div>
                                       )}
                                       {isDocAnalyzing && (
                                           <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                               <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                                               <p className="font-bold text-lg animate-pulse">{videoStatusMessage}</p>
                                           </div>
                                       )}
                                   </div>
                               ) : <div className="text-white/50">파일을 선택하세요</div>}
                           </div>
                           
                           {/* Queue Strip */}
                           <div className="h-20 bg-white border-t border-slate-200 flex items-center gap-2 px-4 overflow-x-auto shrink-0">
                               <button onClick={() => queueInputRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 shrink-0">
                                   <Plus size={20}/>
                               </button>
                               {queue.map(item => (
                                   <div key={item.id} onClick={()=>setActiveQueueId(item.id)} className={`w-16 h-16 rounded-lg border-2 overflow-hidden relative cursor-pointer shrink-0 ${activeQueueId === item.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}>
                                       <img src={item.previewUrl || ''} className="w-full h-full object-cover"/>
                                       {item.status === 'done' && <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center"><Check size={20} className="text-white"/></div>}
                                   </div>
                               ))}
                           </div>
                       </div>
                   )}
               </div>

               {/* RIGHT PANE: Form (Hidden on mobile if tab != form) */}
               <div className={`w-full lg:w-[480px] bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl z-30 relative ${activeMobileTab === 'form' ? 'flex' : 'hidden lg:flex'}`}>
                   <div className="bg-white border-b border-slate-200 p-4 shrink-0 flex items-center justify-between">
                       <div>
                           <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1"><PenTool size={14}/> 입력 정보 확인</h2>
                       </div>
                       {extractedResults.length > 0 && (
                           <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                               <button onClick={()=>currentResultIndex>0 && setCurrentResultIndex(p=>p-1)} disabled={currentResultIndex===0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronLeft size={16}/></button>
                               <span className="text-xs font-bold w-12 text-center">{currentResultIndex+1} / {extractedResults.length}</span>
                               <button onClick={()=>currentResultIndex<extractedResults.length-1 && setCurrentResultIndex(p=>p+1)} disabled={currentResultIndex>=extractedResults.length-1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronRight size={16}/></button>
                           </div>
                       )}
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar pb-24">
                        
                        {/* 0. TBM Log Upload Section */}
                        <div className="space-y-1 mb-2">
                            <label className="text-[11px] font-bold text-slate-500 block">TBM 일지 (분석 대상)</label>
                            {currentLogBase64 ? (
                                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 shadow-sm group bg-slate-50">
                                    <img src={currentLogBase64} className="w-full h-full object-contain" />
                                    <div 
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                        onClick={() => setActiveMobileTab('queue')}
                                    >
                                        <span className="text-white text-xs font-bold flex items-center gap-1"><Eye size={14}/> 크게 보기</span>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveQueueId(null); setExtractedResults([]); }}
                                        className="absolute top-2 right-2 bg-white rounded-full p-1.5 text-slate-500 hover:text-red-500 shadow-sm z-10"
                                    >
                                        <X size={14}/>
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => {
                                        if (window.innerWidth < 1024) setActiveMobileTab('queue');
                                        queueInputRef.current?.click();
                                    }}
                                    className="w-full h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors gap-2 bg-slate-50/50"
                                >
                                    <div className="bg-indigo-50 text-indigo-600 p-2 rounded-full">
                                        <FileText size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">일지 촬영/업로드 (AI 분석)</span>
                                </div>
                            )}
                        </div>

                        {/* Form Inputs */}
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">작업 일자</label>
                                    <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                                <div className="w-1/3 space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">시작 시간</label>
                                    <input type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 block">작업 팀</label>
                                <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="" disabled>팀 선택</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">팀장명</label>
                                    <input type="text" value={leaderName} onChange={(e) => setLeaderName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">인원</label>
                                    <input type="number" value={attendeesCount} onChange={(e) => setAttendeesCount(parseInt(e.target.value)||0)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"/>
                                </div>
                            </div>
                        </div>

                        {/* Media Upload */}
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">활동 증빙 사진</label>
                                    <div onClick={()=>photoInputRef.current?.click()} className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer bg-slate-50 relative overflow-hidden">
                                        {tbmPhotoPreview ? <img src={tbmPhotoPreview} className="w-full h-full object-cover"/> : <Camera size={20} className="text-slate-400"/>}
                                    </div>
                                    <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload}/>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[11px] font-bold text-slate-500 block">동영상 (선택)</label>
                                    <div onClick={()=>videoInputRef.current?.click()} className="aspect-video rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer bg-slate-50 relative overflow-hidden">
                                        {tbmVideoPreview ? 
                                            <video src={tbmVideoPreview} controls className="w-full h-full object-contain bg-black" onClick={(e) => e.stopPropagation()} /> 
                                            : <Film size={20} className="text-slate-400"/>
                                        }
                                    </div>
                                    <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={handleVideoUpload}/>
                                </div>
                            </div>
                            
                            {/* AI Video Analysis Trigger */}
                            {tbmVideoPreview && (
                                <button 
                                    onClick={handleRunVideoAnalysis} 
                                    disabled={isVideoAnalyzing}
                                    className="w-full py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                                >
                                    {isVideoAnalyzing ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span>{videoStatusMessage}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Zap size={14} className="fill-indigo-600"/> ⚡ AI 초고속 분석 (3배속)
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Analysis Result Display - EDITABLE */}
                            {videoAnalysis && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 transition-all">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-700">분석 결과 (수정 가능)</span>
                                            <Sliders size={12} className="text-slate-400"/>
                                        </div>
                                        <span className={`text-xs font-black px-2 py-0.5 rounded ${videoAnalysis.score >= 80 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                                            {videoAnalysis.score}점 / 100
                                        </span>
                                    </div>
                                    
                                    {/* Editable Sliders */}
                                    <div className="grid grid-cols-1 gap-2 mb-3">
                                        {Object.entries(videoAnalysis.rubric).filter(([k]) => typeof RUBRIC_MAX[k] !== 'undefined').map(([key, val]) => (
                                            <div key={key} className="flex flex-col">
                                                <div className="flex justify-between items-end mb-1">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{RUBRIC_LABELS[key]}</span>
                                                    <span className="text-[10px] font-mono font-bold text-slate-700">{val as number}</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max={RUBRIC_MAX[key]} 
                                                    value={val as number} 
                                                    onChange={(e) => handleRubricChange(key, parseInt(e.target.value))}
                                                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* [UPDATED] Editable Evaluation Textarea */}
                                    <div className="relative">
                                        <textarea 
                                            value={videoAnalysis.evaluation}
                                            onChange={(e) => handleEvaluationChange(e.target.value)}
                                            className="w-full text-[10px] text-slate-600 italic bg-white p-2 rounded border border-slate-200 min-h-[60px] outline-none focus:border-indigo-300 resize-none"
                                            placeholder="AI 분석 결과 멘트"
                                        />
                                        <div className="absolute bottom-2 right-2 text-[8px] text-slate-300 pointer-events-none">
                                            <PenTool size={8}/>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Work Content */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500 block">작업 내용</label>
                            <textarea value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none h-20"/>
                        </div>

                        {/* Risk Factors */}
                        <div className="space-y-2">
                             <div className="flex justify-between items-end border-b pb-1">
                                <label className="text-[11px] font-bold text-slate-500">위험 요인</label>
                                <button onClick={addRiskFactor} className="text-[10px] text-blue-600 font-bold flex items-center gap-1"><Plus size={10}/> 추가</button>
                             </div>
                             {riskFactors.map((r, i) => (
                                 <div key={i} className="bg-slate-50 p-2 rounded border space-y-1">
                                     <input value={r.risk} onChange={(e)=>handleRiskChange(i,'risk',e.target.value)} placeholder="위험" className="w-full bg-transparent text-xs font-bold border-b border-dashed outline-none"/>
                                     <input value={r.measure} onChange={(e)=>handleRiskChange(i,'measure',e.target.value)} placeholder="대책" className="w-full bg-transparent text-xs text-slate-600 outline-none"/>
                                 </div>
                             ))}
                        </div>

                        {/* Safety Manager Feedback Section */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                                    <UserCheck size={12}/> 안전관리자 코멘트
                                </label>
                                <button 
                                    onClick={handleTextGapAnalysis}
                                    disabled={isFeedbackGenerating || !workDescription}
                                    className="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-2 py-1 rounded font-bold hover:bg-orange-100 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {isFeedbackGenerating ? <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div> : <BrainCircuit size={12}/>}
                                    누락 자동 점검
                                </button>
                            </div>
                            
                            <div className="bg-orange-50/30 p-2 rounded-lg border border-orange-100 space-y-2">
                                {safetyFeedback.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 text-center py-2">등록된 피드백이 없습니다.</p>
                                ) : (
                                    safetyFeedback.map((fb, idx) => (
                                        <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded border border-orange-100 shadow-sm">
                                            {editingFeedbackIndex === idx ? (
                                                <div className="flex-1 flex gap-1">
                                                    <input 
                                                        value={tempFeedbackText} 
                                                        onChange={(e) => setTempFeedbackText(e.target.value)}
                                                        className="flex-1 text-xs border rounded px-1 py-0.5"
                                                    />
                                                    <button onClick={handleSaveEditFeedback} className="text-green-600 text-[10px] font-bold">저장</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] text-slate-700 flex-1 leading-snug">{fb}</span>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button onClick={() => handleStartEditFeedback(idx)} className="text-slate-400 hover:text-blue-500"><PenTool size={12}/></button>
                                                        <button onClick={() => handleDeleteFeedback(idx)} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                                
                                <div className="flex gap-1 mt-2">
                                    <input 
                                        value={newFeedbackInput}
                                        onChange={(e) => setNewFeedbackInput(e.target.value)}
                                        placeholder="직접 입력..."
                                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-orange-300"
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback()}
                                    />
                                    <button onClick={handleAddFeedback} className="px-2 py-1 bg-slate-800 text-white rounded text-[10px] font-bold hover:bg-slate-700">추가</button>
                                </div>
                            </div>
                        </div>

                   </div>
               </div>
            </div>
        )}
        
        {/* Mobile Tab Bar */}
        {!showGuide && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around z-[100] safe-area-bottom shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                <button 
                    onClick={() => setActiveMobileTab('queue')} 
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeMobileTab === 'queue' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400'}`}
                >
                    <FileText size={20} className={activeMobileTab === 'queue' ? 'fill-blue-100' : ''}/>
                    <span className="text-[10px] font-bold">TBM 일지</span>
                </button>
                <div className="w-px h-8 bg-slate-100"></div>
                <button 
                    onClick={() => setActiveMobileTab('form')} 
                    className={`flex flex-col items-center justify-center w-full h-full gap-1 ${activeMobileTab === 'form' ? 'text-blue-600 bg-blue-50/50' : 'text-slate-400'}`}
                >
                    <PenTool size={20} className={activeMobileTab === 'form' ? 'fill-blue-100' : ''}/>
                    <span className="text-[10px] font-bold">입력정보</span>
                </button>
            </div>
        )}
    </div>,
    document.body
  );
};
