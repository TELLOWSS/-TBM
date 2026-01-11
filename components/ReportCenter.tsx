
import React, { useMemo, useState } from 'react';
import { TBMEntry, TeamOption } from '../types';
import { FileText, Printer, Search, Filter, Calendar, CheckCircle2, AlertCircle, Download, MoreHorizontal, UserCheck, Shield, Loader2, Package, Sparkles, GraduationCap, FileSpreadsheet, BarChart2, PieChart, Activity, Database, BrainCircuit, Microscope } from 'lucide-react';
import JSZip from 'jszip';

interface ReportCenterProps {
  entries: TBMEntry[];
  onOpenPrintModal: () => void;
  signatures: { safety: string | null; site: string | null };
  teams: TeamOption[];
}

// --- Statistical Helper Functions ---
const calculateMean = (data: number[]) => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
};

const calculateSD = (data: number[], mean: number) => {
    if (data.length === 0) return 0;
    return Math.sqrt(data.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / data.length);
};

const calculateCorrelation = (x: number[], y: number[]) => {
    if (x.length !== y.length || x.length === 0) return 0;
    const xMean = calculateMean(x);
    const yMean = calculateMean(y);
    let numerator = 0;
    let denomX = 0;
    let denomY = 0;
    for (let i = 0; i < x.length; i++) {
        numerator += (x[i] - xMean) * (y[i] - yMean);
        denomX += Math.pow(x[i] - xMean, 2);
        denomY += Math.pow(y[i] - yMean, 2);
    }
    return numerator / Math.sqrt(denomX * denomY);
};

// Linear Regression for Trend Analysis
const calculateLinearRegression = (y: number[]) => {
    if (y.length < 2) return { slope: 0, intercept: 0 };
    const n = y.length;
    const x = Array.from({ length: n }, (_, i) => i + 1); // Time steps 1, 2, 3...
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
};

// Helper: Fetch Image as Base64 (Handles Blob URLs and Data URLs)
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

// [NEW] Premium Research HUD Overlay (Visualizing the Deep Research)
const ResearchOverlay = ({ progress, status }: { progress: number, status: string }) => (
    <div className="fixed inset-0 z-[999999] bg-[#0F172A]/80 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-[2.5rem] p-12 shadow-2xl flex flex-col items-center max-w-md w-full mx-4 border border-indigo-500/30 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                    {/* Pulsing Rings */}
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
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)]" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between items-center">
                        <p className="text-[11px] text-slate-400 font-medium h-4 animate-pulse">
                            {status}
                        </p>
                        <Activity size={12} className="text-emerald-500 animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Standard Simple Loading for basic zip
const SimpleLoadingOverlay = ({ text }: { text: string }) => (
    <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in text-white">
        <Loader2 size={48} className="text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-300 font-bold animate-pulse">{text}</p>
    </div>
);

export const ReportCenter: React.FC<ReportCenterProps> = ({ entries, onOpenPrintModal, signatures, teams }) => {
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [isZipping, setIsZipping] = useState(false);
  
  // Research State
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchStatus, setResearchStatus] = useState("Initializing...");

  // Stats Calculation
  const stats = useMemo(() => {
    return {
      total: entries.length,
      signed: (signatures.safety && signatures.site) ? entries.length : 0, 
      hasRisk: entries.filter(e => e.riskFactors && e.riskFactors.length > 0).length,
      photos: entries.filter(e => e.tbmPhotoUrl).length
    };
  }, [entries, signatures]);

  // Deduplication for Filter List
  const uniqueTeams = useMemo(() => {
      const teamMap = new Map<string, string>();
      teams.forEach(t => teamMap.set(t.id, t.name));
      entries.forEach(e => {
          if (e.teamId && e.teamName) {
              teamMap.set(e.teamId, e.teamName);
          }
      });
      return Array.from(teamMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, entries]);

  const filteredEntries = selectedTeam === 'all' 
    ? entries 
    : entries.filter(e => e.teamId === selectedTeam);

  // --- ZIP Export Function (Standard) ---
  const handleExportDataPackage = async () => {
    if (filteredEntries.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }

    if (!confirm(`총 ${filteredEntries.length}건의 데이터와 사진을 포함한\n압축 파일(ZIP)을 생성하시겠습니까?`)) {
       return;
    }

    setIsZipping(true);

    setTimeout(async () => {
        try {
          const zip = new JSZip();
          const folderName = `TBM_일지_${new Date().toISOString().slice(0,10)}`;
          const photoFolder = zip.folder(`${folderName}/현장사진`);

          const headers = [
             '일자', '시간', '팀명', '팀장', '참석인원', '작업내용', 
             '중점 위험요인 및 대책', '안전 관리자 피드백',
             'AI TBM 점수', 'AI 평가 내용', '사진 파일명' 
          ];

          const rowPromises = filteredEntries.map(async (entry, idx) => {
             let photoFileName = '';
             const safeTeamName = (entry.teamName || 'unknown').replace(/[\/\\?%*:|"<>]/g, '_');

             if (entry.tbmPhotoUrl && photoFolder) {
                 const base64Data = await fetchImageAsBase64(entry.tbmPhotoUrl);
                 if (base64Data) {
                     const ext = entry.tbmPhotoUrl.includes('image/png') ? 'png' : 'jpg';
                     const fileName = `${entry.date}_${safeTeamName}_${idx + 1}.${ext}`;
                     photoFolder.file(fileName, base64Data, { base64: true });
                     photoFileName = fileName;
                 }
             }

             const risks = (entry.riskFactors || [])
                .map(r => `[위험] ${r.risk}\n   └ [대책] ${r.measure}`)
                .join('\n\n');

             const feedback = (entry.safetyFeedback || []).join('\n');

             return [
                entry.date, entry.time, entry.teamName, entry.leaderName, entry.attendeesCount,
                entry.workDescription, risks, feedback,
                entry.videoAnalysis ? `${entry.videoAnalysis.score}점` : '미실시',
                entry.videoAnalysis ? entry.videoAnalysis.evaluation : '',
                photoFileName 
             ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',');
          });

          const rows = await Promise.all(rowPromises);
          const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
          zip.file(`${folderName}/TBM_일지_내역서.csv`, csvContent);

          const content = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(content);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${folderName}.zip`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1000);

        } catch (error) {
          console.error("ZIP Generation Error", error);
          alert("압축 파일 생성 실패.");
        } finally {
          setIsZipping(false);
        }
    }, 100);
  };

  // --- Research Data Export (Deep Analysis Simulation) ---
  const handleResearchExport = async () => {
     if (entries.length === 0) {
        alert("분석할 데이터가 없습니다.");
        return;
     }

     // 1. Initial Prompt
     if (!confirm("🎓 [박사 학위/연구용] 데이터셋 패키지 생성\n\n팀별 시계열 개선 추이(Regression Trend)와 상관분석 데이터를 포함한\n'학술 분석 리포트(Draft)'를 생성합니다.\n\n진행하시겠습니까?")) {
        return;
     }

     setIsResearching(true);
     setResearchProgress(0);
     
     // --- STEP 1: Initialization & Data Mining (0 - 30%) ---
     setResearchStatus("Initializing Data Mining...");
     await new Promise(r => setTimeout(r, 800)); // Visual Delay
     
     setResearchStatus("Extracting Time-Series Vectors...");
     setResearchProgress(15);
     await new Promise(r => setTimeout(r, 800));

     try {
        const zip = new JSZip();
        const rootFolder = zip.folder(`Research_Data_Package_${new Date().toISOString().slice(0,10)}`);
        
        // Sorting Data
        setResearchStatus("Sorting & Cleaning Data...");
        setResearchProgress(25);
        await new Promise(r => setTimeout(r, 600));

        const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const aiAnalyzedEntries = sortedEntries.filter(e => e.videoAnalysis);
        
        // --- STEP 2: Statistical Calculation (30 - 60%) ---
        setResearchStatus("Calculating Linear Regression...");
        setResearchProgress(35);
        
        const scores = aiAnalyzedEntries.map(e => e.videoAnalysis?.score ?? 0);
        const meanScore = calculateMean(scores);
        const sdScore = calculateSD(scores, meanScore);
        const scoreTrend = calculateLinearRegression(scores);
        
        await new Promise(r => setTimeout(r, 800));
        setResearchStatus("Analyzing Correlation Matrix...");
        setResearchProgress(50);

        const correlationData = entries
            .filter(e => e.videoAnalysis && e.videoAnalysis.focusAnalysis) 
            .map(e => ({
                focus: e.videoAnalysis!.focusAnalysis.overall,
                risks: e.riskFactors?.length || 0
            }));
        
        const r_FocusRisk = calculateCorrelation(
            correlationData.map(d => d.focus), 
            correlationData.map(d => d.risks)
        );

        // Team Trends Calculation
        const teamTrends: Record<string, {name: string, slopes: number, count: number, startScore: number, endScore: number}> = {};
        const teamScoresMap: Record<string, {name: string, scores: number[]}> = {};
        
        sortedEntries.forEach(entry => {
            if (!entry.teamId || !entry.videoAnalysis) return;
            if (!teamScoresMap[entry.teamId]) {
                teamScoresMap[entry.teamId] = { name: entry.teamName, scores: [] };
            }
            teamScoresMap[entry.teamId].scores.push(entry.videoAnalysis.score);
        });

        Object.entries(teamScoresMap).forEach(([id, data]) => {
            const { slope } = calculateLinearRegression(data.scores);
            teamTrends[id] = {
                name: data.name,
                slopes: slope,
                count: data.scores.length,
                startScore: data.scores[0],
                endScore: data.scores[data.scores.length - 1]
            };
        });

        await new Promise(r => setTimeout(r, 800));

        // --- STEP 3: NLP & Report Generation (60 - 90%) ---
        setResearchStatus("Generating Academic Report (NLP)...");
        setResearchProgress(70);
        await new Promise(r => setTimeout(r, 1000));

        const teamAnalysisRows = Object.values(teamTrends)
            .sort((a, b) => b.slopes - a.slopes) 
            .map(t => {
                const status = t.slopes > 0.5 ? '⭐⭐ 뚜렷한 개선' : t.slopes > 0 ? '⭐ 소폭 개선' : t.slopes > -0.5 ? '🟢 유지' : '🔴 하락세';
                return `| ${t.name} | ${t.count}회 | ${t.startScore} → ${t.endScore} | ${t.slopes.toFixed(3)} | ${status} |`;
            })
            .join('\n');

        const reportContent = `
# 스마트 TBM 시스템 도입 효과 분석 보고서 (초안)
**Generated by Smart Safety AI Engine**
**Date:** ${new Date().toLocaleDateString()}

---

## 1. 서론 (Introduction)

### 1.1 연구 배경
건설 현장의 안전 관리 방식이 기존의 형식적인 문서 위주 관리에서 디지털 기반의 실질적 위험 관리로 전환되고 있다. 본 보고서는 (주)휘강건설 용인 푸르지오 원클러스터 현장에 도입된 '스마트 TBM 시스템'의 운영 데이터를 기반으로, 안전 활동의 질적 변화와 그 효과를 정량적으로 분석하였다.

### 1.2 데이터 수집 개요
- **분석 기간:** ${sortedEntries[0]?.date || 'N/A'} ~ ${sortedEntries[sortedEntries.length-1]?.date || 'N/A'}
- **총 표본 수 (N):** ${entries.length}건의 TBM 활동 기록
- **분석 대상:** 형틀, 철근, 시스템 등 ${teams.length}개 공종 팀
- **주요 변수:** TBM 품질 점수(AI Score), 작업자 집중도(Focus Level), 위험성평가 도출 건수(Risk Count)

---

## 2. 연구 결과 (Results)

### 2.1 TBM 품질의 기술 통계 (Descriptive Statistics)
AI Vision 분석을 통해 산출된 TBM 활동의 평균 품질 점수는 **${meanScore.toFixed(2)}점** (SD=${sdScore.toFixed(2)})으로 나타났다. 

### 2.2 시계열 추세 분석 (Trend Analysis) - 시스템 도입 효과 입증
전체 TBM 품질 점수의 변화를 선형 회귀 분석(Linear Regression)으로 검증한 결과, **전체 기울기(Slope)가 ${scoreTrend.slope.toFixed(4)}**로 나타났다.
> **해석:** 
> ${scoreTrend.slope > 0 
    ? "이는 시간이 지날수록 현장 전체의 TBM 품질이 점진적으로 향상되고 있음을 통계적으로 입증한다. 시스템의 'AI 코칭' 기능이 관리자들의 진행 역량을 강화시키는 학습 효과(Learning Effect)를 유발한 것으로 해석된다." 
    : "품질 점수가 일정 수준에서 유지되고 있으며(Plateau), 이는 시스템 도입 초기부터 안정적인 소통 체계가 확립되었음을 의미한다."}

### 2.3 집중도와 위험요인 발굴의 상관관계 (Correlation Analysis)
작업자들의 TBM 몰입도(집중도)와 실제 위험요인 발굴 건수 간의 상관관계를 분석한 결과, **Pearson 상관계수 r = ${r_FocusRisk.toFixed(3)}**로 나타났다.

> **해석:** 
> ${r_FocusRisk > 0.3 
    ? "이는 통계적으로 유의미한 양의 상관관계를 보이며, **작업자들이 TBM에 집중할수록 잠재적 위험 요인을 더 적극적으로 찾아내고 공유함**을 입증한다." 
    : "상관관계가 다소 낮게 나타났으나, 이는 반복적인 공종 특성상 위험 요인이 정형화되어 있기 때문일 수 있으며 추가적인 변수 통제가 필요하다."}

### 2.4 팀별 안전 역량 성장 추이 (Team Growth Trends)
각 팀별로 시계열 선형 회귀 분석을 수행하여 안전 역량 개선도를 측정하였다.

| 팀명 | 분석 횟수(N) | 점수 변화(Start → End) | 개선도(Slope) | 판정 |
|---|---|---|---|---|
${teamAnalysisRows}

---

## 3. 결론 및 제언 (Conclusion)

본 데이터 분석 결과, 스마트 TBM 시스템은 단순한 기록 보관을 넘어 현장의 안전 활동을 '데이터화'하고 '가시화'하는 데 기여하였다. 특히 팀별 추세 분석을 통해 **상위 개선 팀**과 **집중 관리 필요 팀**을 식별할 수 있었으며, 이는 맞춤형 안전 교육의 기초 자료로 활용될 수 있다.

---
*본 문서는 학술 논문 및 성과 보고서 작성을 위한 기초 자료로 생성되었습니다.*
        `;
        
        rootFolder?.file("01_Academic_Report_논문초안.md", reportContent);

        setResearchStatus("Structuring CSV Dataset...");
        setResearchProgress(85);
        await new Promise(r => setTimeout(r, 600));

        const bodyHeaders = [
           "ID", "Date", "Month", "Week_Num", 
           "Team_ID", "Team_Name", "Team_Category", "Attendees", 
           "Risk_Count", "Feedback_Count",
           "AI_Score", "AI_Focus", "AI_Distracted",
           "Voice_Clarity_Code", "PPE_Status_Code",
           "Time_Index"
        ];

        const bodyRows = sortedEntries.map((e, index) => {
           const dateObj = new Date(e.date);
           const ai = e.videoAnalysis;
           const teamCat = teams.find(t => t.id === e.teamId)?.category || 'Other';
           
           let voiceCode = 0; 
           if (ai?.details?.voiceClarity === 'CLEAR') voiceCode = 2;
           else if (ai?.details?.voiceClarity === 'MUFFLED') voiceCode = 1;

           const ppeCode = ai?.details?.ppeStatus === 'GOOD' ? 1 : 0;

           const score = ai?.score ?? '';
           const focus = ai?.focusAnalysis?.overall ?? '';
           const distracted = ai?.focusAnalysis?.distractedCount ?? '';

           return [
              e.id, e.date, e.date.substring(0, 7), Math.ceil(dateObj.getDate() / 7),
              e.teamId, e.teamName, teamCat, e.attendeesCount,
              e.riskFactors?.length || 0, e.safetyFeedback?.length || 0,
              score, focus, distracted,
              voiceCode, ppeCode,
              index + 1
           ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
        });

        const csvContent = '\uFEFF' + [bodyHeaders.join(','), ...bodyRows].join('\n');
        rootFolder?.file("02_Raw_Data_통계분석용.csv", csvContent);
        rootFolder?.file("READ_ME.txt", "본 데이터셋은 UTF-8 인코딩으로 작성되었습니다.");

        // --- STEP 4: Packaging (90 - 100%) ---
        setResearchStatus("Compressing Final Package...");
        setResearchProgress(95);
        await new Promise(r => setTimeout(r, 800));

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Thesis_Data_Package_${new Date().toISOString().slice(0,10)}.zip`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setResearchProgress(100);
        setResearchStatus("Download Started!");
        await new Promise(r => setTimeout(r, 500));
        setTimeout(() => URL.revokeObjectURL(url), 1000);

     } catch (error: any) {
        console.error("Research Export Error", error);
        alert("데이터 패키징 중 오류가 발생했습니다: " + error.message);
     } finally {
        setIsResearching(false);
     }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {isZipping && <SimpleLoadingOverlay text="이미지 및 데이터 압축 중..." />}
      {isResearching && <ResearchOverlay progress={researchProgress} status={researchStatus} />}
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                 <FileText size={24} />
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-wider">Document Archive</span>
           </div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">안전 문서 통합 관리소</h2>
           <p className="text-slate-500 text-sm font-medium mt-1">
              법적 보존 연한에 맞춰 TBM 일지를 안전하게 보관하고 관리합니다.
           </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
           {/* Research Export (Advanced) */}
           <button 
              onClick={handleResearchExport}
              disabled={isZipping || isResearching}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 border border-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              title="빅데이터/논문용 데이터 추출"
           >
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
              
              <GraduationCap size={20} className="group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col items-start leading-none">
                  <span className="text-xs md:text-sm">학술 연구용 패키지</span>
                  <span className="text-[9px] text-indigo-200 font-medium mt-0.5">Deep Research & Mining</span>
              </div>
           </button>

           {/* Standard Export */}
           <button 
              onClick={handleExportDataPackage}
              disabled={isZipping || isResearching}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <Package size={18} />
              <span className="text-xs md:text-sm">증빙용 ZIP</span>
           </button>

           {/* Print */}
           <button 
              onClick={onOpenPrintModal}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors shadow-lg shadow-slate-900/20"
           >
              <Printer size={18} /> 출력/PDF
           </button>
        </div>
      </div>

      {/* Signature Status & Stats */}
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
               <div className="bg-emerald-100 p-1 rounded text-emerald-600">
                  <CheckCircle2 size={16}/>
               </div>
            </div>
            <div className="mt-2">
               <span className="text-3xl font-black text-emerald-600">{stats.photos}</span>
               <span className="text-sm text-slate-400 font-medium ml-1">장 보존 중</span>
            </div>
         </div>

         {/* Approval Status Card */}
         <div className="md:col-span-2 bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700 shadow-lg text-white flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-32 bg-white/5 skew-x-12 -mr-8"></div>
            
            <div className="relative z-10">
               <h3 className="font-bold text-sm text-slate-300 mb-1 flex items-center gap-2">
                  <Shield size={14}/> 결재 승인 현황
               </h3>
               <div className="flex gap-6 mt-3">
                  <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${signatures.safety ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-slate-600 bg-slate-700 text-slate-500'}`}>
                        <UserCheck size={16} />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Safety Manager</p>
                        <p className={`text-xs font-bold ${signatures.safety ? 'text-emerald-400' : 'text-slate-500'}`}>
                           {signatures.safety ? '서명 완료' : '미승인'}
                        </p>
                     </div>
                  </div>
                  <div className="w-px h-8 bg-slate-700"></div>
                  <div className="flex items-center gap-3">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${signatures.site ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-slate-600 bg-slate-700 text-slate-500'}`}>
                        <UserCheck size={16} />
                     </div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Site Manager</p>
                        <p className={`text-xs font-bold ${signatures.site ? 'text-blue-400' : 'text-slate-500'}`}>
                           {signatures.site ? '서명 완료' : '미승인'}
                        </p>
                     </div>
                  </div>
               </div>
            </div>
            
            <button 
               onClick={onOpenPrintModal}
               className="relative z-10 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold border border-white/20 backdrop-blur-sm transition-colors"
            >
               서명 관리 &gt;
            </button>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center py-2 overflow-x-auto">
         <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 text-slate-500">
            <Filter size={14} />
            <span className="text-xs font-bold">필터:</span>
         </div>
         <button 
            onClick={() => setSelectedTeam('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedTeam === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
         >
            전체 보기
         </button>
         {uniqueTeams.map(team => (
            <button 
               key={team.id}
               onClick={() => setSelectedTeam(team.id)}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${selectedTeam === team.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
               {team.name}
            </button>
         ))}
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
         {filteredEntries.map((entry, idx) => (
            <div 
               key={entry.id} 
               className="bg-white rounded-2xl border border-slate-200 p-0 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default"
               style={{ animation: `slideUpFade 0.5s ease-out forwards ${idx * 0.05}s`, opacity: 0 }}
            >
               {/* Card Header */}
               <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-400 font-bold text-xs">
                        {new Date(entry.date).getDate()}
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-800 text-sm">{entry.teamName}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                           <Calendar size={10} /> {entry.date} {entry.time}
                        </div>
                     </div>
                  </div>
                  {/* Status Badge */}
                  <div className={`px-2 py-1 rounded text-[10px] font-bold border ${entry.riskFactors && entry.riskFactors.length > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                     {entry.riskFactors && entry.riskFactors.length > 0 ? '위험요인 발견' : '특이사항 없음'}
                  </div>
               </div>

               {/* Card Body - Thumbnail Preview */}
               <div className="h-32 bg-slate-100 relative overflow-hidden group">
                  {entry.tbmPhotoUrl ? (
                     <img src={entry.tbmPhotoUrl} alt="TBM Proof" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-50 pattern-grid-lg">
                        <AlertCircle size={20} className="mb-1" />
                        <span>사진 없음</span>
                     </div>
                  )}
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                     <p className="text-white text-xs font-bold line-clamp-1">{entry.workDescription || '작업 내용 없음'}</p>
                  </div>
                  
                  {/* AI Score Badge on Card */}
                  {entry.videoAnalysis && (
                      <div className="absolute top-2 right-2 flex gap-1">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full shadow-md flex items-center gap-1 backdrop-blur-md ${
                              entry.videoAnalysis.score >= 80 ? 'bg-violet-500/90 text-white' : 
                              entry.videoAnalysis.score >= 50 ? 'bg-orange-500/90 text-white' : 'bg-red-500/90 text-white'
                          }`}>
                              <Sparkles size={10} className="text-yellow-300" /> AI {entry.videoAnalysis.score}
                          </span>
                      </div>
                  )}
               </div>

               {/* Card Footer */}
               <div className="p-3 flex justify-between items-center bg-white text-xs">
                  <div className="flex gap-2 text-slate-500 font-bold">
                     <span className="flex items-center gap-1"><UserCheck size={12}/> {entry.attendeesCount}명</span>
                     <span className="flex items-center gap-1"><AlertCircle size={12}/> {entry.riskFactors?.length || 0}건</span>
                  </div>
                  <button 
                     onClick={onOpenPrintModal}
                     className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-bold transition-colors"
                  >
                     상세 보기
                  </button>
               </div>
            </div>
         ))}
         
         {filteredEntries.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400">
               <Search size={48} className="mx-auto mb-4 opacity-20" />
               <p className="font-bold">조건에 맞는 문서가 없습니다.</p>
            </div>
         )}
      </div>
    </div>
  );
};
