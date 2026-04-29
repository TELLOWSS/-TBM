
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TBMEntry, RiskAssessmentItem, SafetyGuideline, TeamOption, TBMAnalysisResult, ScoreRubric, MonthlyRiskAssessment } from '../types';
import { analyzeMasterLog, evaluateTBMVideo, generateSafetyFeedback } from '../services/geminiService';
import { compressVideo, type VideoCompressionResult } from '../utils/videoUtils';
import { Upload, Camera, FileText, X, Layers, ArrowLeft, Trash2, Film, Save, Plus, UserCheck, BrainCircuit, CheckCircle2, AlertCircle, Loader2, PlayCircle, Zap, Image as ImageIcon, Copy, Sparkles, Maximize, ScanText, ChevronRight, SplitSquareHorizontal, Paperclip, Users, Eye, Mic, Edit3, Sliders, Shield, Award } from 'lucide-react';

interface TBMFormProps {
    onSave: (data: TBMEntry | TBMEntry[], shouldExit?: boolean) => Promise<boolean>;
  onCancel: () => void;
  monthlyGuidelines: SafetyGuideline[];
    riskAssessments?: MonthlyRiskAssessment[];
    linkedRiskAssessment?: {
        id?: string;
        fileName: string;
        label: string;
        total: number;
        high: number;
        actionNotes: number;
    };
  initialData?: TBMEntry;
  onDelete?: (id: string) => void;
  teams: TeamOption[];
  mode?: 'BATCH' | 'ROUTINE';
}

interface QueueItem extends Partial<TBMEntry> {
  tempId: string;
  file?: File; 
  originalLogFile?: File;
  originalLogPreview?: string;
  tbmPhotoFile?: File;
  tbmPhotoPreview?: string; 
  tbmVideoFile?: File;
  tbmVideoPreview?: string;
  status: 'WAITING' | 'ANALYZING' | 'READY' | 'SAVED' | 'ERROR';
  analysisResult?: string;
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
  });
};

export const TBMForm: React.FC<TBMFormProps> = ({ onSave, onCancel, monthlyGuidelines, riskAssessments, linkedRiskAssessment, initialData, onDelete, teams, mode = 'ROUTINE' }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
    const [mobileSection, setMobileSection] = useState<'MEDIA' | 'FORM'>('FORM');
  
  // [UPDATED] Default date set to current system date
  const [entryDate, setEntryDate] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [entryTime, setEntryTime] = useState('07:30');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [leaderName, setLeaderName] = useState('');
  const [attendeesCount, setAttendeesCount] = useState<number>(0);
  const [workDescription, setWorkDescription] = useState('');
  const [riskFactors, setRiskFactors] = useState<RiskAssessmentItem[]>([]);
  const [safetyFeedback, setSafetyFeedback] = useState<string[]>([]);
  
  const [originalLogPreview, setOriginalLogPreview] = useState<string | null>(null);
  const [tbmPhotoPreview, setTbmPhotoPreview] = useState<string | null>(null);
  const [tbmVideoFile, setTbmVideoFile] = useState<File | null>(null);
  const [tbmVideoPreview, setTbmVideoPreview] = useState<string | null>(null);
  const [tbmVideoFileName, setTbmVideoFileName] = useState<string | null>(null);
  
  const [videoAnalysis, setVideoAnalysis] = useState<TBMAnalysisResult | null>(null);
  const [videoStatusMessage, setVideoStatusMessage] = useState<string>(''); 
    const [announceMessage, setAnnounceMessage] = useState('');
  const [isVideoAnalyzing, setIsVideoAnalyzing] = useState(false);
    const [videoUploadState, setVideoUploadState] = useState<'IDLE' | 'CHECKING' | 'READY' | 'ERROR'>('IDLE');
    const [videoUploadMessage, setVideoUploadMessage] = useState('');
    const [videoAnalysisProgress, setVideoAnalysisProgress] = useState(0);
        const [videoAnalysisStartedAt, setVideoAnalysisStartedAt] = useState<number | null>(null);
        const [videoAnalysisEtaSec, setVideoAnalysisEtaSec] = useState<number | null>(null);
        const [videoEstimatedTotalSec, setVideoEstimatedTotalSec] = useState<number | null>(null);
  const [isDocAnalyzing, setIsDocAnalyzing] = useState(false);

  const [editingFeedbackIndex, setEditingFeedbackIndex] = useState<number | null>(null);
  const [tempFeedbackText, setTempFeedbackText] = useState("");
  const [newFeedbackInput, setNewFeedbackInput] = useState("");
  const [isFeedbackGenerating, setIsFeedbackGenerating] = useState(false);

  const resolvedLinkedRiskAssessment = React.useMemo(() => {
      const validAssessments = (riskAssessments || []).filter(assessment => Array.isArray(assessment.priorities) && assessment.priorities.length > 0);
      if (validAssessments.length === 0) return undefined;

      const targetMonth = entryDate?.slice(0, 7);
      const exactMonthly = validAssessments
          .filter(assessment => assessment.type === 'MONTHLY' && assessment.month === targetMonth)
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];

      if (exactMonthly) return exactMonthly;

      const latestMonthly = validAssessments
          .filter(assessment => assessment.type === 'MONTHLY')
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];

      if (latestMonthly) return latestMonthly;

      return [...validAssessments].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
  }, [riskAssessments, entryDate]);

  const effectiveGuidelines = resolvedLinkedRiskAssessment?.priorities || monthlyGuidelines;

  const linkedRiskSuggestions = React.useMemo(() => {
      return [...effectiveGuidelines]
          .filter(item => item.level === 'HIGH' || !!item.actionNote?.trim())
          .sort((a, b) => {
              if (a.level === 'HIGH' && b.level !== 'HIGH') return -1;
              if (a.level !== 'HIGH' && b.level === 'HIGH') return 1;
              if (!!a.actionNote?.trim() && !b.actionNote?.trim()) return -1;
              if (!a.actionNote?.trim() && !!b.actionNote?.trim()) return 1;
              return 0;
          })
          .slice(0, 5);
  }, [effectiveGuidelines]);

  const selectedTeam = React.useMemo(() => teams.find(team => team.id === teamId), [teams, teamId]);

  const normalizeCategory = (value: string) => value.replace(/\s|\/|\(|\)|팀/gi, '').toLowerCase();

  const teamFocusedLinkedRiskSuggestions = React.useMemo(() => {
      if (linkedRiskSuggestions.length === 0) return [];
      const selectedCategory = normalizeCategory(selectedTeam?.category || '');
      const selectedName = normalizeCategory(selectedTeam?.name || '');

      const scored = linkedRiskSuggestions.map(item => {
          const guidelineCategory = normalizeCategory(item.category || '');
          const isCommon = guidelineCategory.includes('공통');
          const matchesTeamCategory = !!selectedCategory && (guidelineCategory.includes(selectedCategory) || selectedCategory.includes(guidelineCategory));
          const matchesTeamName = !!selectedName && (guidelineCategory.includes(selectedName) || selectedName.includes(guidelineCategory));
          const score = isCommon ? 1 : matchesTeamCategory ? 3 : matchesTeamName ? 2 : 0;
          return { item, score };
      });

      const focused = scored.filter(entry => entry.score > 0).sort((a, b) => b.score - a.score).map(entry => entry.item);
      return focused.length > 0 ? focused : linkedRiskSuggestions;
  }, [linkedRiskSuggestions, selectedTeam]);

  const linkedRiskAssessmentSummary = React.useMemo(() => {
      if (resolvedLinkedRiskAssessment) {
          return {
              fileName: resolvedLinkedRiskAssessment.fileName,
              label: resolvedLinkedRiskAssessment.type === 'INITIAL'
                  ? '최초 위험성평가'
                  : resolvedLinkedRiskAssessment.type === 'REGULAR'
                  ? `${resolvedLinkedRiskAssessment.month.split('-')[0]}년 정기 위험성평가`
                  : `${resolvedLinkedRiskAssessment.month}월 월간/수시 위험성평가`,
              total: resolvedLinkedRiskAssessment.priorities.length,
              high: resolvedLinkedRiskAssessment.priorities.filter(item => item.level === 'HIGH').length,
              actionNotes: resolvedLinkedRiskAssessment.priorities.filter(item => !!item.actionNote?.trim()).length,
              id: resolvedLinkedRiskAssessment.id,
              matchedByMonth: resolvedLinkedRiskAssessment.type === 'MONTHLY' && resolvedLinkedRiskAssessment.month === entryDate.slice(0, 7),
          };
      }

      if (linkedRiskAssessment) {
          return {
              ...linkedRiskAssessment,
              matchedByMonth: false,
          };
      }

      return undefined;
  }, [resolvedLinkedRiskAssessment, linkedRiskAssessment, entryDate]);

  const buildMeasureFromGuideline = (guideline: SafetyGuideline) => {
      if (guideline.actionNote?.trim()) return guideline.actionNote.trim();
      return `${guideline.category} 작업 전 위험요인 공유 및 보호구/작업순서 재점검`;
  };

    const normalizeRiskText = (value: string) => value.trim().replace(/\s+/g, ' ');
  const isLikelyVideoFile = (file: File) => {
      const mime = (file.type || '').toLowerCase();
      if (mime.startsWith('video/')) return true;

      const name = (file.name || '').toLowerCase();
      const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
      const allowedExt = new Set(['.mp4', '.mov', '.m4v', '.3gp', '.webm', '.avi', '.mkv']);
      return allowedExt.has(ext);
  };

  const estimateTotalSeconds = (fileSizeMB: number, profileLabel?: 'BALANCED' | 'FAST' | 'ULTRA_FAST') => {
      const sizeFactor = Math.min(1.8, Math.max(0.7, fileSizeMB / 80));

      let base = 18;
      if (profileLabel === 'ULTRA_FAST') base = 12;
      else if (profileLabel === 'FAST') base = 15;
      else if (profileLabel === 'BALANCED') base = 20;

      // 프로파일 미확정(초기 단계)에서는 파일 크기 기반으로 대략 추정
      if (!profileLabel) {
          if (fileSizeMB >= 200) base = 14;
          else if (fileSizeMB >= 50) base = 17;
          else base = 21;
      }

      return Math.round(base * sizeFactor);
  };

  const announceStatus = (message: string) => {
      setAnnounceMessage('');
      requestAnimationFrame(() => {
          setAnnounceMessage(message);
      });
  };

  const logInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // [FIX] Track blob URL to revoke on change/unmount (memory leak prevention)
  const videoBlobUrlRef = useRef<string | null>(null);
    const compressedVideoCacheRef = useRef<{ key: string; result: VideoCompressionResult } | null>(null);

  // [FIX] Revoke video blob URL on component unmount
    React.useEffect(() => {
      return () => {
          if (videoBlobUrlRef.current) {
              URL.revokeObjectURL(videoBlobUrlRef.current);
              videoBlobUrlRef.current = null;
          }
      };
  }, []);

    React.useEffect(() => {
      if (!isVideoAnalyzing || !videoAnalysisStartedAt) {
          setVideoAnalysisEtaSec(null);
          return;
      }

      const calculateEta = () => {
          if (videoAnalysisProgress <= 3) {
              setVideoAnalysisEtaSec(null);
              return;
          }

          const elapsedSec = (Date.now() - videoAnalysisStartedAt) / 1000;
          const progressBasedTotal = Math.max(elapsedSec / (videoAnalysisProgress / 100), elapsedSec + 2);
          const calibratedTotal = videoEstimatedTotalSec ? Math.max(progressBasedTotal * 0.7 + videoEstimatedTotalSec * 0.3, elapsedSec + 2) : progressBasedTotal;
          const totalEstimatedSec = calibratedTotal;
          const remainingSec = Math.max(0, Math.round(totalEstimatedSec - elapsedSec));
          setVideoAnalysisEtaSec(remainingSec);
      };

      calculateEta();
      const timer = window.setInterval(calculateEta, 700);
      return () => window.clearInterval(timer);
    }, [isVideoAnalyzing, videoAnalysisStartedAt, videoAnalysisProgress, videoEstimatedTotalSec]);

    React.useEffect(() => {
      if (initialData) {
          const item: QueueItem = {
              tempId: initialData.id,
              status: 'READY',
              ...initialData,
              originalLogPreview: initialData.originalLogImageUrl,
              tbmPhotoPreview: initialData.tbmPhotoUrl,
              tbmVideoPreview: initialData.tbmVideoUrl
          };
          setQueue([item]);
          setActiveId(item.tempId);
      } else if (mode === 'ROUTINE' && queue.length === 0) {
          const newItem: QueueItem = { tempId: `NEW-${Date.now()}`, status: 'WAITING' };
          setQueue([newItem]);
          setActiveId(newItem.tempId);
      }
  }, [initialData, mode]);

    React.useEffect(() => {
      const activeItem = queue.find(q => q.tempId === activeId);
      if (activeItem) {
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          
          setEntryDate(activeItem.date || todayStr);
          setEntryTime(activeItem.time || '07:30');
          setTeamId(activeItem.teamId || teams[0]?.id || '');
          setLeaderName(activeItem.leaderName || '');
          setAttendeesCount(activeItem.attendeesCount || 0);
          setWorkDescription(activeItem.workDescription || '');
          setRiskFactors(activeItem.riskFactors || []);
          setSafetyFeedback(activeItem.safetyFeedback || []);
          
          setOriginalLogPreview(activeItem.originalLogPreview || activeItem.originalLogImageUrl || null);
          setTbmPhotoPreview(activeItem.tbmPhotoPreview || activeItem.tbmPhotoUrl || null);
          setTbmVideoPreview(activeItem.tbmVideoPreview || activeItem.tbmVideoUrl || null);
          setTbmVideoFileName(activeItem.tbmVideoFileName || null);
          
          setVideoAnalysis(activeItem.videoAnalysis || null);
      }
  }, [activeId, queue]);

  const updateActiveItem = (updates: Partial<QueueItem>) => {
      setQueue(prev => prev.map(item => item.tempId === activeId ? { ...item, ...updates } : item));
  };

  const handleDateChange = (v: string) => { setEntryDate(v); updateActiveItem({ date: v }); };
  const handleTimeChange = (v: string) => { setEntryTime(v); updateActiveItem({ time: v }); };
  const handleTeamChange = (v: string) => { setTeamId(v); updateActiveItem({ teamId: v, teamName: teams.find(t=>t.id===v)?.name }); };
  const handleLeaderChange = (v: string) => { setLeaderName(v); updateActiveItem({ leaderName: v }); };
  const handleCountChange = (v: number) => { setAttendeesCount(v); updateActiveItem({ attendeesCount: v }); };
  const handleWorkChange = (v: string) => { setWorkDescription(v); updateActiveItem({ workDescription: v }); };
  
  const addRiskFactor = () => {
      const newRisks = [...riskFactors, { risk: '', measure: '' }];
      setRiskFactors(newRisks);
      updateActiveItem({ riskFactors: newRisks });
  };
  const handleRiskChange = (i: number, field: keyof RiskAssessmentItem, val: string) => {
      const newRisks = [...riskFactors];
      newRisks[i][field] = val;
      setRiskFactors(newRisks);
      updateActiveItem({ riskFactors: newRisks });
  };
  const removeRiskFactor = (i: number) => {
      const newRisks = riskFactors.filter((_, idx) => idx !== i);
      setRiskFactors(newRisks);
      updateActiveItem({ riskFactors: newRisks });
  };

  const handleImportLinkedGuideline = (guideline: SafetyGuideline) => {
      const normalizedRisk = normalizeRiskText(guideline.content || '');
      if (!normalizedRisk) {
          announceStatus('가져올 위험요인 내용이 비어 있습니다.');
          return;
      }

      const exists = riskFactors.some(item => normalizeRiskText(item.risk || '') === normalizedRisk);
      if (exists) {
          announceStatus('이미 동일한 위험요인이 등록되어 있습니다.');
          return;
      }

      const next = [
          ...riskFactors,
          {
              risk: normalizedRisk,
              measure: buildMeasureFromGuideline(guideline),
          }
      ];
      setRiskFactors(next);
      updateActiveItem({ riskFactors: next });
      setMobileSection('FORM');
      announceStatus('연계된 위험성평가 항목을 위험요인에 추가했습니다.');
  };

  const handleImportAllLinkedGuidelines = () => {
      if (teamFocusedLinkedRiskSuggestions.length === 0) {
          announceStatus('가져올 연계 위험성평가 항목이 없습니다.');
          return;
      }

      const existingRisks = new Set(riskFactors.map(item => normalizeRiskText(item.risk || '')));
      const seen = new Set(existingRisks);
      const appendItems = teamFocusedLinkedRiskSuggestions.reduce<RiskAssessmentItem[]>((acc, item) => {
          const normalizedRisk = normalizeRiskText(item.content || '');
          if (!normalizedRisk || seen.has(normalizedRisk)) return acc;
          seen.add(normalizedRisk);
          acc.push({
              risk: normalizedRisk,
              measure: buildMeasureFromGuideline(item),
          });
          return acc;
      }, []);

      if (appendItems.length === 0) {
          announceStatus('추천 항목이 이미 모두 등록되어 있습니다.');
          return;
      }

      const next = [...riskFactors, ...appendItems];
      setRiskFactors(next);
      updateActiveItem({ riskFactors: next });
      setMobileSection('FORM');
      announceStatus(`연계 위험성평가 ${appendItems.length}건을 위험요인에 일괄 반영했습니다.`);
  };

  const handleApplyActionNotesToFeedback = () => {
      const noteFeedback = teamFocusedLinkedRiskSuggestions
          .filter(item => !!item.actionNote?.trim())
          .map(item => `[${item.category}] ${item.actionNote!.trim()}`);

      if (noteFeedback.length === 0) {
          announceStatus('안전 코멘트로 반영할 조치메모가 없습니다.');
          return;
      }

      const merged = Array.from(new Set([...safetyFeedback, ...noteFeedback]));
      setSafetyFeedback(merged);
      updateActiveItem({ safetyFeedback: merged });
      setMobileSection('FORM');
      announceStatus(`조치메모 ${noteFeedback.length}건을 안전 코멘트에 반영했습니다.`);
  };

  const handleAddFeedback = () => { if (newFeedbackInput.trim()) { const n = [...safetyFeedback, newFeedbackInput.trim()]; setSafetyFeedback(n); updateActiveItem({ safetyFeedback: n }); setNewFeedbackInput(""); } };
  const handleDeleteFeedback = (index: number) => { const n = safetyFeedback.filter((_, i) => i !== index); setSafetyFeedback(n); updateActiveItem({ safetyFeedback: n }); };
  const handleStartEditFeedback = (index: number) => { setEditingFeedbackIndex(index); setTempFeedbackText(safetyFeedback[index]); };
  const handleSaveEditFeedback = () => { if (editingFeedbackIndex !== null) { const updated = [...safetyFeedback]; updated[editingFeedbackIndex] = tempFeedbackText; setSafetyFeedback(updated); updateActiveItem({ safetyFeedback: updated }); setEditingFeedbackIndex(null); } };

  // --- Analysis Editable Handlers ---
  const handleAnalysisChange = (field: keyof TBMAnalysisResult, value: string) => {
      if (!videoAnalysis) return;
      const updated = { ...videoAnalysis, [field]: value };
      setVideoAnalysis(updated);
      updateActiveItem({ videoAnalysis: updated });
  };

  // Rubric Slider Logic
  const handleRubricChange = (field: keyof ScoreRubric, value: number) => {
      if (!videoAnalysis) return;
      
      const currentRubric = videoAnalysis.rubric || { logQuality:0, focus:0, voice:0, ppe:0, deductions:[] };
      const newRubric = { ...currentRubric, [field]: value };
      
      // Auto-calculate total score
      const newScore = (newRubric.logQuality || 0) + (newRubric.focus || 0) + (newRubric.voice || 0) + (newRubric.ppe || 0);
      
      const updated = {
          ...videoAnalysis,
          rubric: newRubric,
          score: newScore
      };
      setVideoAnalysis(updated);
      updateActiveItem({ videoAnalysis: updated });
  };

  // 1. Original Log (OCR Source)
  const handleLogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          // [FIX] 이미지 파일 크기 제한 — 10MB 초과 시 IndexedDB OOM 방지
          if (file.size > 10 * 1024 * 1024) {
              announceStatus('이미지 파일이 너무 큽니다. 최대 10MB까지 업로드할 수 있습니다.');
              e.target.value = '';
              return;
          }
          const preview = await blobToBase64(file);
          setOriginalLogPreview(preview);
          updateActiveItem({ originalLogFile: file, originalLogPreview: preview, originalLogImageUrl: preview });
      }
  };

  // 2. TBM Photo (Proof)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          // [FIX] 이미지 파일 크기 제한 — 10MB 초과 시 IndexedDB OOM 방지
          if (file.size > 10 * 1024 * 1024) {
              announceStatus('이미지 파일이 너무 큽니다. 최대 10MB까지 업로드할 수 있습니다.');
              e.target.value = '';
              return;
          }
          const preview = await blobToBase64(file);
          setTbmPhotoPreview(preview);
          updateActiveItem({ tbmPhotoFile: file, tbmPhotoPreview: preview, tbmPhotoUrl: preview });
      }
  };

  // 3. TBM Video
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setVideoUploadState('CHECKING');
          setVideoUploadMessage('영상 파일 확인 중...');

          // [FIX] Revoke previous blob URL before creating a new one
          if (videoBlobUrlRef.current) {
              URL.revokeObjectURL(videoBlobUrlRef.current);
              videoBlobUrlRef.current = null;
          }
          const file = e.target.files[0];
          if (!isLikelyVideoFile(file)) {
              setVideoUploadState('ERROR');
              setVideoUploadMessage('동영상 형식을 확인해주세요.');
              announceStatus('동영상 파일만 업로드할 수 있습니다. (지원: MP4/MOV/M4V/3GP/WEBM 등)');
              e.target.value = '';
              return;
          }
          if (!file.size || file.size <= 0) {
              setVideoUploadState('ERROR');
              setVideoUploadMessage('파일 읽기에 실패했습니다. 다시 선택해주세요.');
              announceStatus('선택한 영상 파일을 읽을 수 없습니다. 다시 선택해주세요.');
              e.target.value = '';
              return;
          }
          // [FIX] 영상 파일 크기 제한 — 500MB 초과 시 메모리 압박 방지
          if (file.size > 500 * 1024 * 1024) {
              setVideoUploadState('ERROR');
              setVideoUploadMessage('파일이 너무 큽니다. 500MB 이하로 선택해주세요.');
              announceStatus('영상 파일이 너무 큽니다. 최대 500MB까지 업로드할 수 있습니다.');
              e.target.value = '';
              return;
          }

          // 새 영상 업로드 시 기존 분석/압축 캐시 초기화
          setVideoAnalysis(null);
          setVideoAnalysisProgress(0);
          compressedVideoCacheRef.current = null;

          setTbmVideoFile(file);
          setTbmVideoFileName(file.name);
          const url = URL.createObjectURL(file);
          videoBlobUrlRef.current = url;
          setTbmVideoPreview(url);
          // [FIX] Do NOT persist blob URL to storage — blob URLs are session-only.
          // Store only the filename as evidence; the video content is analysed on upload.
          updateActiveItem({ tbmVideoUrl: null, tbmVideoFileName: file.name });
          setVideoUploadState('READY');
          setVideoUploadMessage(`업로드 완료: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

          // 모바일에서 동일 파일 재선택 시 change 이벤트가 누락되는 문제 방지
          e.target.value = '';
      }
  };

  const handleSidebarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newItems: QueueItem[] = [];
      const fileList = Array.from(files) as File[];
      
      for (const file of fileList) {
          if (file.type.startsWith('image/')) {
              const preview = await blobToBase64(file);
              newItems.push({
                  tempId: `ITEM-${Date.now()}-${Math.random()}`,
                  originalLogFile: file,
                  originalLogPreview: preview,
                  originalLogImageUrl: preview,
                  status: 'WAITING',
                  date: entryDate,
                  time: entryTime,
                  teamId: teamId
              });
          }
      }

      if (mode === 'ROUTINE' && queue.length === 1 && !queue[0].originalLogPreview) {
          setQueue(newItems);
          setActiveId(newItems[0].tempId);
      } else {
          setQueue(prev => [...prev, ...newItems]);
          if (!activeId && newItems.length > 0) setActiveId(newItems[0].tempId);
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper: Find best team match
  const findBestMatchingTeam = (extractedName: string): string => {
      if (!extractedName) return teamId;

      // 1. Clean up noise (Company names, common suffixes)
      // Removes: '휘강', '건설', '(주)', '주식회사', 'team', '팀', spaces
      const cleanInput = extractedName.replace(/휘강|건설|\(주\)|주식회사|team|팀|\s/gi, '').trim();
      
      if (cleanInput.length === 0) return teamId; // If nothing left (e.g. input was just "휘강건설"), keep current

      let bestMatchId = teamId;
      let highestScore = 0;

      teams.forEach(t => {
          const cleanTeamName = t.name.replace(/팀|\s/g, '');
          let score = 0;

          // Exact substring match (strongest signal)
          if (cleanTeamName.includes(cleanInput) || cleanInput.includes(cleanTeamName)) {
              score += 10;
              // Bonus for length similarity (avoids short string matching everything)
              const lengthDiff = Math.abs(cleanTeamName.length - cleanInput.length);
              score -= lengthDiff;
          }

          if (score > highestScore) {
              highestScore = score;
              bestMatchId = t.id;
          }
      });

      return bestMatchId;
  };

  const handleAnalyzeDocument = async () => {
    if (!originalLogPreview) {
                announceStatus('분석할 수기 일지 사진이 없습니다.');
        return;
    }
    
    setIsDocAnalyzing(true);
    try {
        const base64Data = originalLogPreview.split(',')[1];
        const mimeType = originalLogPreview.split(';')[0].split(':')[1];

        const results = await analyzeMasterLog(base64Data, mimeType, effectiveGuidelines, 'ROUTINE');
        
        if (results && results.length > 0) {
            const data = results[0];
            
            const newWork = data.workDescription || workDescription;
            const newLeader = data.leaderName || leaderName;
            const newCount = data.attendeesCount || attendeesCount;
            
            // [UPDATED] Smart Matching Logic
            let newTeamId = teamId;
            if (data.teamName) {
                newTeamId = findBestMatchingTeam(data.teamName);
            }

            setWorkDescription(newWork);
            setLeaderName(newLeader);
            setAttendeesCount(newCount);
            setTeamId(newTeamId);

            if (data.riskFactors && data.riskFactors.length > 0) {
                setRiskFactors(data.riskFactors);
            }
            if (data.safetyFeedback && data.safetyFeedback.length > 0) {
                setSafetyFeedback(data.safetyFeedback);
            }

            updateActiveItem({
                workDescription: newWork,
                leaderName: newLeader,
                attendeesCount: newCount,
                teamId: newTeamId,
                teamName: teams.find(t => t.id === newTeamId)?.name || data.teamName, // Use matched name if possible
                riskFactors: data.riskFactors,
                safetyFeedback: data.safetyFeedback
            });

            announceStatus('수기 일지 내용이 자동으로 입력되었습니다.');
        } else {
            announceStatus('텍스트를 인식하지 못했습니다. 사진을 확인해주세요.');
        }
    } catch (e: any) {
        console.error(e);
        const msg = e.message || '';
        announceStatus(msg.includes('429') || msg.includes('Quota') || msg.includes('제한') ? msg : '분석 중 오류가 발생했습니다.');
    } finally {
        setIsDocAnalyzing(false);
    }
  };

  const handleTextGapAnalysis = async () => {
    if (!workDescription) {
                announceStatus('작업 내용을 먼저 입력해주세요.');
        return;
    }
    setIsFeedbackGenerating(true);
    try {
        const newFeedback = await generateSafetyFeedback(workDescription, riskFactors, effectiveGuidelines);
        
        if (newFeedback && newFeedback.length > 0) {
            const merged = Array.from(new Set([...safetyFeedback, ...newFeedback]));
            setSafetyFeedback(merged);
            updateActiveItem({ safetyFeedback: merged });
            announceStatus(`${newFeedback.length}개의 안전 코멘트가 생성되었습니다.`);
        } else {
            announceStatus('생성된 코멘트가 없습니다. 작업 내용을 더 자세히 입력해보세요.');
        }
    } catch (e: any) {
        console.error(e);
        const msg = e.message || '';
        announceStatus(msg.includes('429') || msg.includes('Quota') || msg.includes('제한') ? msg : 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
        setIsFeedbackGenerating(false);
    }
  };

  const handleRunVideoAnalysis = async () => {
    if (!tbmVideoFile) return;
    setIsVideoAnalyzing(true);
    setVideoAnalysisProgress(10);
        setVideoAnalysisStartedAt(Date.now());
        setVideoAnalysisEtaSec(null);
        setVideoEstimatedTotalSec(estimateTotalSeconds(tbmVideoFile.size / 1024 / 1024));
    setVideoStatusMessage("영상 최적화 준비 중...");
    setVideoUploadState('CHECKING');
    setVideoUploadMessage('AI 분석 준비 중...');

    try {
        const fileKey = `${tbmVideoFile.name}:${tbmVideoFile.size}:${tbmVideoFile.lastModified}`;
        let compressionResult: VideoCompressionResult;

        if (compressedVideoCacheRef.current?.key === fileKey) {
            compressionResult = compressedVideoCacheRef.current.result;
            setVideoStatusMessage(`압축 결과 재사용 (${compressionResult.profile.label})`);
            setVideoAnalysisProgress(35);
            setVideoEstimatedTotalSec(estimateTotalSeconds(compressionResult.originalSizeMB, compressionResult.profile.label));
        } else {
            setVideoStatusMessage('영상 자동 축소/고속 처리 중...');
            setVideoAnalysisProgress(25);
            compressionResult = await compressVideo(tbmVideoFile);
            compressedVideoCacheRef.current = { key: fileKey, result: compressionResult };
            setVideoAnalysisProgress(60);
            setVideoEstimatedTotalSec(estimateTotalSeconds(compressionResult.originalSizeMB, compressionResult.profile.label));
        }

        const base64Video = await blobToBase64(compressionResult.blob);
        setVideoAnalysisProgress(75);
        setVideoStatusMessage(`AI 분석 중 (${compressionResult.profile.label}, ${compressionResult.profile.playbackRate.toFixed(1)}x)`);
        setVideoUploadMessage(`AI 분석 진행: ${compressionResult.profile.label} 프로파일`);
        
        const result = await evaluateTBMVideo(
            base64Video.split(',')[1],
            compressionResult.mimeType,
            { workDescription, riskFactors },
            effectiveGuidelines
        );
        setVideoAnalysisProgress(95);

        setVideoAnalysis(result);
        updateActiveItem({ videoAnalysis: result });

        if (result.feedback && result.feedback.length > 0) {
            const currentFeedback = [...safetyFeedback];
            result.feedback.forEach(fb => {
                if (!currentFeedback.includes(fb)) currentFeedback.push(fb);
            });
            setSafetyFeedback(currentFeedback);
            updateActiveItem({ safetyFeedback: currentFeedback });
        }
        setVideoAnalysisProgress(100);
        setVideoUploadState('READY');
        setVideoUploadMessage('AI 분석 완료. 결과를 확인하세요.');
        announceStatus(`AI 분석 완료: ${compressionResult.originalSizeMB.toFixed(1)}MB → ${compressionResult.compressedSizeKB.toFixed(0)}KB (${compressionResult.profile.label})`);
    } catch (e: any) {
        console.error(e);
        const msg = e.message || '';
        setVideoUploadState('ERROR');
        setVideoUploadMessage('AI 분석 실패. 네트워크/파일 상태를 확인해주세요.');
        announceStatus(msg.includes('429') || msg.includes('Quota') || msg.includes('제한') ? msg : 'AI 분석에 실패했습니다.');
    } finally {
        setIsVideoAnalyzing(false);
        setVideoAnalysisStartedAt(null);
        setVideoAnalysisEtaSec(null);
        setVideoEstimatedTotalSec(null);
        setVideoStatusMessage("");
    }
  };

  // [UPDATED] Save All Items in Queue (Batch Save Logic)
    const handleSaveAll = async () => {
      if (queue.length === 0) return;
      
      const now = new Date();
      const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Map all items in the queue to TBMEntry objects
      const entriesToSave: TBMEntry[] = queue.map((item, index) => {
          const uniqueSuffix = Math.random().toString(36).substr(2, 6); // Ensure unique ID per item
          return {
              id: item.id || `ENTRY-${Date.now()}-${index}-${uniqueSuffix}`,
              date: item.date || defaultDate,
              time: item.time || '07:30',
              teamId: item.teamId || teams[0]?.id || '',
              teamName: item.teamName || teams.find(t => t.id === (item.teamId || teams[0]?.id))?.name || '미지정',
              leaderName: item.leaderName || '',
              attendeesCount: item.attendeesCount || 0,
              workDescription: item.workDescription || '',
              riskFactors: item.riskFactors || [],
              safetyFeedback: item.safetyFeedback || [],
              tbmPhotoUrl: item.tbmPhotoUrl || item.tbmPhotoPreview, // Ensure URL is taken
              originalLogImageUrl: item.originalLogImageUrl || item.originalLogPreview,
              videoAnalysis: item.videoAnalysis,
              tbmVideoFileName: item.tbmVideoFileName,
              // [FIX] blob: URL은 세션 종료 후 무효화되므로 절대 저장하지 않음
              tbmVideoUrl: item.tbmVideoUrl?.startsWith('blob:') ? null : (item.tbmVideoUrl || null),
              linkedRiskAssessmentId: linkedRiskAssessmentSummary?.id,
              linkedRiskAssessmentLabel: linkedRiskAssessmentSummary?.label,
              linkedRiskAssessmentMatchedByMonth: linkedRiskAssessmentSummary?.matchedByMonth,
              linkedRiskAssessmentHighCount: linkedRiskAssessmentSummary?.high,
              linkedRiskAssessmentActionNoteCount: linkedRiskAssessmentSummary?.actionNotes,
              createdAt: item.createdAt || Date.now()
          };
      });

      // Filter out virtually empty items (e.g. initial placeholder if not touched)
      // We keep items that have at least an image OR a team name set
    const validEntries = entriesToSave.filter(e => e.teamName !== '미지정' || e.tbmPhotoUrl || e.originalLogImageUrl);

      if (validEntries.length === 0) {
          announceStatus('저장할 유효한 데이터가 없습니다.');
          return;
      }

      if (await onSave(validEntries, true)) {
          // Success handled by parent (usually closing form)
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#F8FAFC] flex flex-col animate-fade-in text-slate-800 font-sans">
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {isDocAnalyzing
                ? '수기 일지 내용을 분석 중입니다.'
                : isVideoAnalyzing
                    ? (videoStatusMessage || '동영상 AI 분석을 진행 중입니다.')
                    : isFeedbackGenerating
                        ? '안전 코멘트를 생성 중입니다.'
                        : (announceMessage || '')}
        </p>
        {/* Header */}
        <div className="min-h-16 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between px-3 md:px-6 py-2 md:py-0 shadow-sm shrink-0 z-50 gap-2 md:gap-0">
           <div className="flex items-center gap-3 md:gap-4 min-w-0 w-full md:w-auto">
              <button onClick={onCancel} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 font-bold transition-colors">
                 <ArrowLeft size={20} />
                 <span>나가기</span>
              </button>
              <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
              <h1 className="text-sm md:text-xl font-black text-slate-800 flex items-center gap-2 truncate">
                 {mode === 'BATCH' ? <Layers className="text-indigo-600" size={24}/> : <FileText className="text-emerald-600" size={24}/>}
                 <span className="truncate">{mode === 'BATCH' ? '대량 일괄 등록 (Batch Mode)' : '스마트 TBM 지휘 및 등록'}</span>
              </h1>
           </div>
           <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
              {initialData && onDelete && (
                  <button onClick={() => onDelete(String(initialData.id))} className="bg-white border border-red-200 text-red-500 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 min-h-[40px]">
                      <Trash2 size={18} /> 삭제
                  </button>
              )}
              <button onClick={handleSaveAll} className="flex-1 md:flex-none bg-slate-900 text-white px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold hover:bg-slate-800 shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 min-h-[42px]">
                  <Save size={18}/> {queue.length > 1 ? `전체 저장 완료 (${queue.length}건)` : '작성 완료'}
              </button>
           </div>
        </div>

        {(videoUploadState !== 'IDLE' || isVideoAnalyzing) && (
            <div className={`shrink-0 px-3 md:px-6 py-2 border-b ${videoUploadState === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-center gap-2">
                    {(isVideoAnalyzing || videoUploadState === 'CHECKING')
                        ? <Loader2 size={14} className="animate-spin text-rose-600"/>
                        : <CheckCircle2 size={14} className={videoUploadState === 'ERROR' ? 'text-red-500' : 'text-emerald-500'} />}
                    <span className={`text-xs md:text-sm font-bold ${videoUploadState === 'ERROR' ? 'text-red-700' : 'text-rose-700'}`}>
                        {isVideoAnalyzing ? (videoStatusMessage || '동영상 AI 분석 진행 중...') : (videoUploadMessage || '동영상 상태 확인 중...')}
                    </span>
                    {isVideoAnalyzing && videoAnalysisEtaSec !== null && videoAnalysisProgress < 100 && (
                        <span className="text-[11px] md:text-xs font-bold text-rose-500">· 약 {videoAnalysisEtaSec}초 남음</span>
                    )}
                </div>
                {isVideoAnalyzing && (
                    <div className="mt-2">
                        <div className="h-1.5 rounded-full bg-rose-100 overflow-hidden">
                            <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${Math.max(8, videoAnalysisProgress)}%` }}></div>
                        </div>
                        <p className="mt-1 text-[10px] text-rose-600 font-semibold text-right">{videoAnalysisProgress}%</p>
                    </div>
                )}
            </div>
        )}

        {/* Body Layout */}
        <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
            {/* 1. Left Sidebar: Queue / List */}
            <div className="w-full lg:w-72 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-sm text-slate-600 uppercase tracking-wider flex items-center gap-2">
                        <Layers size={14}/> 대기열 (Queue)
                    </h3>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-black">{queue.length}</span>
                </div>
                <div className="overflow-x-auto lg:overflow-y-auto p-3 custom-scrollbar">
                    <div className="flex lg:block gap-3 lg:space-y-3 min-w-max lg:min-w-0">
                    {queue.map((item, idx) => (
                        <div 
                            key={item.tempId}
                            onClick={() => setActiveId(item.tempId)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveId(item.tempId);
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`${item.teamName || `항목 ${idx + 1}`} 선택`}
                            className={`min-w-[220px] lg:min-w-0 p-3 rounded-2xl cursor-pointer border-2 transition-all flex gap-3 items-center group relative ${activeId === item.tempId ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-100' : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                        >
                            <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center border border-slate-300">
                                {item.originalLogPreview ? <img src={item.originalLogPreview} className="w-full h-full object-cover"/> : <FileText size={20} className="text-slate-400"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${activeId === item.tempId ? 'text-indigo-800' : 'text-slate-700'}`}>
                                    {item.teamName || `항목 #${idx + 1}`}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                                    {item.status === 'WAITING' ? <span className="w-2 h-2 rounded-full bg-slate-300"></span> : <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                                    {item.status === 'WAITING' ? '작성 대기' : item.status}
                                </p>
                            </div>
                            <button 
                                type="button"
                                aria-label={`${item.teamName || `항목 ${idx + 1}`} 대기열에서 제거`}
                                onClick={(e) => { e.stopPropagation(); setQueue(queue.filter(q => q.tempId !== item.tempId)); }}
                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 p-1 bg-white border border-red-100 shadow-sm rounded-full text-red-500 hover:bg-red-50 transition-all hover:scale-110"
                            >
                                <X size={14}/>
                            </button>
                        </div>
                    ))}
                    
                    <div onClick={() => fileInputRef.current?.click()} onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                        }
                    }} role="button" tabIndex={0} aria-label="사진 추가 또는 새 항목 생성" className="p-4 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all min-h-[100px] group">
                        <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                            <Plus size={20}/>
                        </div>
                        <span className="text-xs font-bold">사진 추가 / 새 항목</span>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleSidebarUpload}/>
                    </div>
                </div>
            </div>

            {/* 2. Main Work Area - Split View */}
            <div className="flex-1 flex overflow-hidden flex-col xl:flex-row">
                <div className="xl:hidden px-4 py-3 border-b border-slate-200 bg-white">
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setMobileSection('MEDIA')}
                            className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${mobileSection === 'MEDIA' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'}`}
                        >
                            미디어
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileSection('FORM')}
                            className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${mobileSection === 'FORM' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-slate-600'}`}
                        >
                            입력데이터
                        </button>
                    </div>
                </div>
                
                {/* LEFT: Media Command Center */}
                <div className={`w-full xl:w-1/2 h-auto xl:h-full flex-col xl:border-r border-slate-200 bg-slate-100/80 overflow-y-auto custom-scrollbar ${mobileSection === 'MEDIA' ? 'flex' : 'hidden'} xl:flex`}>
                    <div className="p-4 sticky top-0 bg-slate-100/90 backdrop-blur z-20 border-b border-slate-200">
                        <h3 className="font-black text-slate-700 flex items-center gap-2"><ImageIcon size={18}/> 미디어 증빙 센터 (Assets)</h3>
                    </div>
                    
                    <div className="p-6 space-y-8 pb-20">
                        
                        {/* Section 1: Handwritten Log */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-black text-indigo-900 flex items-center gap-2">
                                    <FileText size={18} className="text-indigo-600"/> ① 수기 일지 (OCR 분석용)
                                </label>
                                <button onClick={()=>logInputRef.current?.click()} className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">변경</button>
                            </div>
                            
                            <div 
                                onClick={()=>!originalLogPreview && logInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && !originalLogPreview) {
                                        e.preventDefault();
                                        logInputRef.current?.click();
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="수기 일지 원본 첨부"
                                className={`aspect-[3/4] rounded-xl border-2 overflow-hidden relative group transition-all ${originalLogPreview ? 'border-indigo-200 bg-slate-50' : 'border-dashed border-slate-300 bg-slate-50 hover:bg-indigo-50 cursor-pointer'}`}
                            >
                                {originalLogPreview ? (
                                    <img src={originalLogPreview} className="w-full h-full object-contain"/>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                        <FileText size={32}/>
                                        <span className="text-xs font-bold">수기 일지 원본 첨부</span>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={logInputRef} className="hidden" accept="image/*" onChange={handleLogUpload}/>

                            {originalLogPreview && (
                                <button 
                                    onClick={handleAnalyzeDocument}
                                    disabled={isDocAnalyzing}
                                    className="w-full mt-3 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    {isDocAnalyzing ? (
                                        <> <Loader2 size={16} className="animate-spin"/> 텍스트 추출 중... </>
                                    ) : (
                                        <> <ScanText size={16} className="text-yellow-300"/> 수기 내용 자동 추출 (OCR) </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Section 2: Action Photo */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-black text-emerald-900 flex items-center gap-2">
                                    <Camera size={18} className="text-emerald-600"/> ③ TBM 활동 사진 (증빙용)
                                </label>
                                <button onClick={()=>photoInputRef.current?.click()} className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100">변경</button>
                            </div>
                            <div 
                                onClick={()=>!tbmPhotoPreview && photoInputRef.current?.click()}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && !tbmPhotoPreview) {
                                        e.preventDefault();
                                        photoInputRef.current?.click();
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="TBM 활동 사진 첨부"
                                className={`aspect-video rounded-xl border-2 overflow-hidden relative group transition-all ${tbmPhotoPreview ? 'border-emerald-200 bg-slate-50' : 'border-dashed border-slate-300 bg-slate-50 hover:bg-emerald-50 cursor-pointer'}`}
                            >
                                {tbmPhotoPreview ? (
                                    <img src={tbmPhotoPreview} className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                        <Camera size={32}/>
                                        <span className="text-xs font-bold">활동 사진 첨부</span>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload}/>
                        </div>

                        {/* Section 3: Video Analysis */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-black text-rose-900 flex items-center gap-2">
                                    <Film size={18} className="text-rose-600"/> ③ TBM 동영상 (AI 정밀진단)
                                </label>
                                <button onClick={()=>videoInputRef.current?.click()} className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded hover:bg-rose-100">변경</button>
                            </div>
                            
                            <div onClick={()=>videoInputRef.current?.click()} onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    videoInputRef.current?.click();
                                }
                            }} role="button" tabIndex={0} aria-label="TBM 동영상 업로드" className={`aspect-video rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-all ${tbmVideoPreview ? 'bg-black border-none' : 'bg-slate-50'}`}>
                                {tbmVideoPreview ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <video src={tbmVideoPreview} className="w-full h-full object-contain" controls/>
                                        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">{tbmVideoFileName}</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <PlayCircle size={32}/>
                                        <span className="text-xs font-bold">동영상 업로드</span>
                                    </div>
                                )}
                            </div>
                            <input type="file" ref={videoInputRef} className="hidden" accept="video/*,.mp4,.mov,.m4v,.3gp,.webm,.avi,.mkv" onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={handleVideoUpload}/>
                            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                                대용량 영상은 자동으로 축소/고속 처리되어 빠른 코칭 분석에 사용됩니다.
                            </p>

                            {(videoUploadState !== 'IDLE' || isVideoAnalyzing) && (
                                <div className={`mt-2 rounded-lg border px-3 py-2 ${videoUploadState === 'ERROR' ? 'border-red-200 bg-red-50' : 'border-rose-200 bg-rose-50'}`}>
                                    <div className="flex items-center gap-2">
                                        {(isVideoAnalyzing || videoUploadState === 'CHECKING')
                                            ? <Loader2 size={14} className="animate-spin text-rose-600"/>
                                            : <CheckCircle2 size={14} className={videoUploadState === 'ERROR' ? 'text-red-500' : 'text-emerald-500'} />}
                                        <span className={`text-[11px] font-bold ${videoUploadState === 'ERROR' ? 'text-red-700' : 'text-rose-700'}`}>
                                            {isVideoAnalyzing ? (videoStatusMessage || 'AI 분석 진행 중...') : (videoUploadMessage || '영상 상태 확인 중')}
                                        </span>
                                    </div>
                                    {isVideoAnalyzing && (
                                        <div className="mt-2">
                                            <div className="h-1.5 rounded-full bg-rose-100 overflow-hidden">
                                                <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${Math.max(8, videoAnalysisProgress)}%` }}></div>
                                            </div>
                                            <p className="mt-1 text-[10px] text-rose-600 font-semibold text-right">{videoAnalysisProgress}%</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {tbmVideoPreview && (
                                <button 
                                    onClick={handleRunVideoAnalysis} 
                                    disabled={isVideoAnalyzing}
                                    className="w-full mt-3 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:translate-y-[-1px] transition-all"
                                >
                                    {isVideoAnalyzing ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin"/> 
                                            <span>{videoStatusMessage}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Sparkles size={16} className="text-yellow-300 animate-pulse"/> AI 안전 정밀 진단 실행
                                        </>
                                    )}
                                </button>
                            )}
                            
                            {videoAnalysis && (
                                <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 animate-fade-in">
                                    <div className="flex justify-between items-center mb-3 border-b border-indigo-100 pb-2">
                                        <span className="text-sm font-black text-indigo-800 flex items-center gap-2">
                                            <Sparkles size={14}/> AI 진단 리포트 (수정 가능)
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-indigo-400">종합 점수</span>
                                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-lg font-black shadow-md shadow-indigo-200">{videoAnalysis.score}</span>
                                        </div>
                                    </div>
                                    
                                    {/* [UPDATED] Score Gauges (Sliders with Colors) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-white p-3 rounded-xl border border-indigo-100">
                                        {[
                                            { key: 'logQuality', label: '일지 충실도', max: 30, icon: <FileText size={12}/>, color: 'accent-indigo-600', text: 'text-indigo-600' },
                                            { key: 'focus', label: '작업자 집중도', max: 30, icon: <Eye size={12}/>, color: 'accent-emerald-600', text: 'text-emerald-600' },
                                            { key: 'voice', label: '전파 명확성', max: 20, icon: <Mic size={12}/>, color: 'accent-amber-500', text: 'text-amber-600' },
                                            { key: 'ppe', label: '보호구 상태', max: 20, icon: <Shield size={12}/>, color: 'accent-rose-500', text: 'text-rose-600' }
                                        ].map((item) => (
                                            <div key={item.key} className="space-y-1">
                                                <div className={`flex justify-between text-[10px] font-bold ${item.text}`}>
                                                    <span className="flex items-center gap-1">{item.icon} {item.label}</span>
                                                    <span>{videoAnalysis.rubric?.[item.key as keyof ScoreRubric] || 0} / {item.max}</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max={item.max} 
                                                    value={videoAnalysis.rubric?.[item.key as keyof ScoreRubric] || 0}
                                                    onChange={(e) => handleRubricChange(item.key as keyof ScoreRubric, parseInt(e.target.value))}
                                                    className={`w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer ${item.color}`}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* [NEW] Leader's Action Card (Coaching) */}
                                    {videoAnalysis.leaderCoaching && (
                                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-xl mb-4 shadow-lg shadow-indigo-200">
                                            <div className="flex items-center gap-2 mb-2 border-b border-white/20 pb-2">
                                                <Award size={16} className="text-yellow-300"/>
                                                <span className="text-xs font-black uppercase tracking-wider">현장 리더 실천 카드</span>
                                            </div>
                                            <p className="text-sm font-bold leading-relaxed mb-2">
                                                "{videoAnalysis.leaderCoaching.actionItem}"
                                            </p>
                                            <p className="text-[10px] bg-white/10 px-2 py-1 rounded inline-block text-indigo-100">
                                                💡 배경: {videoAnalysis.leaderCoaching.rationale}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {/* Editable Evaluation Fields */}
                                        {[
                                            { key: 'evalLog', label: '일지 작성 평가', icon: <FileText size={12}/> },
                                            { key: 'evalAttendance', label: '참석 및 참여도 평가', icon: <Users size={12}/> },
                                            { key: 'evalFocus', label: '작업자 집중도 평가', icon: <Eye size={12}/> },
                                            { key: 'evalLeader', label: '주관자(팀장) 리딩 평가', icon: <Mic size={12}/> },
                                        ].map((field) => (
                                            <div key={field.key} className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                                    {field.icon} {field.label}
                                                </label>
                                                <div className="relative group">
                                                    <textarea 
                                                        value={(videoAnalysis as any)[field.key] || ''}
                                                        onChange={(e) => handleAnalysisChange(field.key as any, e.target.value)}
                                                        className="w-full text-xs font-medium text-slate-700 bg-white border border-indigo-100 rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none resize-none h-16 shadow-sm transition-all"
                                                    />
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                                        <Edit3 size={12} className="text-slate-400"/>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <div className="pt-2 border-t border-indigo-100">
                                            <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                                                <UserCheck size={12}/> 종합 의견
                                            </label>
                                            <textarea 
                                                value={videoAnalysis.evaluation}
                                                onChange={(e) => handleAnalysisChange('evaluation', e.target.value)}
                                                className="w-full text-xs font-bold text-slate-800 bg-white border border-indigo-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-300 outline-none resize-none h-24 shadow-sm leading-relaxed"
                                                placeholder="건설안전기술사의 종합 소견이 입력됩니다."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* RIGHT: Form Data (Scrollable) */}
                <div className={`w-full xl:w-1/2 h-auto xl:h-full overflow-y-auto bg-white custom-scrollbar ${mobileSection === 'FORM' ? 'block' : 'hidden'} xl:block`}>
                    <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-2">
                        <FileText size={18} className="text-slate-500"/>
                        <h3 className="font-black text-slate-700">입력 데이터</h3>
                    </div>
                    
                    <div className="p-6 md:p-8 space-y-8 max-w-2xl mx-auto">
                        <div className={`rounded-2xl border p-4 ${linkedRiskAssessmentSummary ? 'border-indigo-200 bg-indigo-50' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${linkedRiskAssessmentSummary ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                                    <Shield size={18}/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-xs font-black text-slate-800">위험성평가 연계 상태</span>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${linkedRiskAssessmentSummary ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>
                                            {linkedRiskAssessmentSummary ? '연계중' : '미연계'}
                                        </span>
                                    </div>
                                    {linkedRiskAssessmentSummary ? (
                                        <>
                                            <p className="text-sm font-bold text-slate-800 leading-snug">{linkedRiskAssessmentSummary.label}</p>
                                            <p className="text-xs text-slate-500 truncate mt-1">{linkedRiskAssessmentSummary.fileName}</p>
                                            <div className="mt-3 grid grid-cols-3 gap-2">
                                                <div className="rounded-xl bg-white/80 border border-indigo-100 px-3 py-2">
                                                    <p className="text-[10px] font-bold text-slate-400">연계 항목</p>
                                                    <p className="text-sm font-black text-slate-800">{linkedRiskAssessmentSummary.total}건</p>
                                                </div>
                                                <div className="rounded-xl bg-white/80 border border-red-100 px-3 py-2">
                                                    <p className="text-[10px] font-bold text-slate-400">상위험</p>
                                                    <p className="text-sm font-black text-red-600">{linkedRiskAssessmentSummary.high}건</p>
                                                </div>
                                                <div className="rounded-xl bg-white/80 border border-emerald-100 px-3 py-2">
                                                    <p className="text-[10px] font-bold text-slate-400">조치메모</p>
                                                    <p className="text-sm font-black text-emerald-600">{linkedRiskAssessmentSummary.actionNotes}건</p>
                                                </div>
                                            </div>
                                            <p className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black ${linkedRiskAssessmentSummary.matchedByMonth ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                                {linkedRiskAssessmentSummary.matchedByMonth ? '입력 일자와 같은 월 위험성평가 우선 연계' : '최신 위험성평가 기준으로 연계'}
                                            </p>
                                            <p className="mt-3 text-[11px] text-slate-600 leading-relaxed">
                                                수기 일지 OCR, 안전 코멘트 생성, 동영상 평가 시 현재 연계된 위험성평가 항목이 함께 사용됩니다.
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-amber-800 leading-relaxed">
                                            현재 연계된 위험성평가가 없습니다. 위험성평가 관리에서 OCR 분석/등록 후 TBM 등록 OCR 정확도를 높일 수 있습니다.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {linkedRiskAssessmentSummary && teamFocusedLinkedRiskSuggestions.length > 0 && (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                                    <div>
                                        <p className="text-sm font-black text-emerald-900">연계 위험성평가 빠른 가져오기</p>
                                        <p className="text-[11px] text-emerald-800 mt-1">{selectedTeam ? `${selectedTeam.name} 기준 우선 추천 · ` : ''}상위위험 및 즉시조치 메모를 TBM 위험요인/대책 초안으로 즉시 반영합니다.</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            type="button"
                                            onClick={handleImportAllLinkedGuidelines}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-4 py-3 text-xs font-black min-h-[44px] shadow-md shadow-emerald-200"
                                        >
                                            <Plus size={14}/> 추천 {teamFocusedLinkedRiskSuggestions.length}건 일괄 가져오기
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleApplyActionNotesToFeedback}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-black text-emerald-700 min-h-[44px]"
                                        >
                                            <UserCheck size={14}/> 조치메모 → 코멘트
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {teamFocusedLinkedRiskSuggestions.map((item, index) => (
                                        <div key={`${item.content}-${index}`} className="rounded-xl border border-emerald-100 bg-white/80 p-3">
                                            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${item.level === 'HIGH' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                                            {item.level === 'HIGH' ? '상위험' : '연계항목'}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500">{item.category}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 leading-snug">{item.content}</p>
                                                    <p className="mt-2 text-[11px] text-slate-600 leading-relaxed">대책 제안: {buildMeasureFromGuideline(item)}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleImportLinkedGuideline(item)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 min-h-[44px] whitespace-nowrap"
                                                >
                                                    <ChevronRight size={14}/> 가져오기
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Form Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">작업 일자</label>
                                <input type="date" value={entryDate} onChange={(e) => handleDateChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">시작 시간</label>
                                <input type="time" value={entryTime} onChange={(e) => handleTimeChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"/>
                            </div>
                            <div className="space-y-1 col-span-2">
                                <label className="text-xs font-bold text-slate-500">작업 팀 선택</label>
                                <select value={teamId} onChange={(e) => handleTeamChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow">
                                    <option value="" disabled>팀 선택</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">팀장명</label>
                                <input type="text" placeholder="이름" value={leaderName} onChange={(e) => handleLeaderChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">참석 인원</label>
                                <div className="relative">
                                    <input type="number" placeholder="0" value={attendeesCount} onChange={(e) => handleCountChange(parseInt(e.target.value)||0)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"/>
                                    <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">명</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500">금일 작업 내용</label>
                            <textarea value={workDescription} onChange={(e) => handleWorkChange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none h-32 focus:ring-2 focus:ring-indigo-500 transition-shadow" placeholder="구체적인 작업 내용을 입력하거나, 좌측 '수기 일지 자동 추출' 버튼을 사용하세요."/>
                        </div>

                        <hr className="border-slate-100"/>

                        {/* Risk Factors */}
                        <div className="space-y-3">
                             <div className="flex justify-between items-center">
                                <label className="text-sm font-black text-slate-700 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500"/> 위험 요인 및 대책</label>
                                <button onClick={addRiskFactor} className="text-xs text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"><Plus size={14}/> 항목 추가</button>
                             </div>
                             <div className="space-y-2">
                                 {riskFactors.map((r, i) => (
                                     <div key={i} className="flex gap-2 items-start group">
                                         <div className="grid grid-cols-1 gap-2 flex-1">
                                             <div className="flex gap-2">
                                                 <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-1 rounded shrink-0 flex items-center">위험</span>
                                                 <input value={r.risk} onChange={(e)=>handleRiskChange(i,'risk',e.target.value)} placeholder="위험 요인 입력" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none flex-1 focus:bg-white focus:border-indigo-300 transition-colors"/>
                                             </div>
                                             <div className="flex gap-2">
                                                 <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-1 rounded shrink-0 flex items-center">대책</span>
                                                 <input value={r.measure} onChange={(e)=>handleRiskChange(i,'measure',e.target.value)} placeholder="안전 대책 입력" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 outline-none flex-1 focus:bg-white focus:border-indigo-300 transition-colors"/>
                                             </div>
                                         </div>
                                         <button onClick={() => removeRiskFactor(i)} aria-label={`${i + 1}번 위험요인 항목 삭제`} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-2"><X size={16}/></button>
                                     </div>
                                 ))}
                                 {riskFactors.length === 0 && (
                                     <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                                         등록된 위험 요인이 없습니다. (수기 일지 추출을 권장합니다)
                                     </div>
                                 )}
                             </div>
                        </div>

                        {/* Feedback */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-black text-slate-700 flex items-center gap-2"><UserCheck size={18} className="text-emerald-600"/> 안전관리자 코멘트</label>
                                <button 
                                    onClick={handleTextGapAnalysis}
                                    disabled={isFeedbackGenerating || !workDescription}
                                    className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1 transition-colors"
                                >
                                    {isFeedbackGenerating ? <Loader2 size={14} className="animate-spin"/> : <BrainCircuit size={14}/>} AI 추천 생성
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {safetyFeedback.map((fb, idx) => (
                                    <div key={idx} className="flex items-start gap-2 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm group hover:border-emerald-300 transition-colors">
                                        {editingFeedbackIndex === idx ? (
                                            <div className="flex-1 flex gap-2">
                                                <input value={tempFeedbackText} onChange={(e) => setTempFeedbackText(e.target.value)} className="flex-1 text-xs border rounded px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500"/>
                                                <button type="button" onClick={handleSaveEditFeedback} className="text-emerald-600 text-xs font-bold px-2">저장</button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="mt-0.5"><CheckCircle2 size={14} className="text-emerald-500"/></div>
                                                <span className="text-xs text-slate-700 flex-1 leading-snug font-medium">{fb}</span>
                                                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => handleStartEditFeedback(idx)} aria-label={`코멘트 ${idx + 1} 수정`} className="text-slate-400 hover:text-blue-500 p-1"><FileText size={14}/></button>
                                                    <button type="button" onClick={() => handleDeleteFeedback(idx)} aria-label={`코멘트 ${idx + 1} 삭제`} className="text-slate-400 hover:text-red-500 p-1"><X size={14}/></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                    <input 
                                        value={newFeedbackInput}
                                        onChange={(e) => setNewFeedbackInput(e.target.value)}
                                        placeholder="코멘트 직접 입력..."
                                        className="flex-1 text-xs border border-emerald-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddFeedback()}
                                    />
                                    <button onClick={handleAddFeedback} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-100">추가</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 md:hidden z-[10000] border-t border-slate-200 bg-white/95 backdrop-blur px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-2">
                <button onClick={onCancel} className="px-3 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold min-h-[48px] whitespace-nowrap">
                    나가기
                </button>
                <div className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-100">
                    <p className="text-[10px] font-bold text-slate-500">현재 입력</p>
                    <p className="text-xs font-black text-slate-800 truncate">{teams.find(t => t.id === teamId)?.name || '팀 미선택'} · {leaderName || '팀장 미입력'}</p>
                </div>
                <button onClick={handleSaveAll} className="px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-black min-h-[48px] whitespace-nowrap shadow-lg">
                    {queue.length > 1 ? `전체 저장 ${queue.length}건` : '작성 완료'}
                </button>
            </div>
        </div>
    </div>,
    document.body
  );
};
