
import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { TBMForm } from './components/TBMForm';
import { RiskAssessmentManager } from './components/RiskAssessmentManager';
import { ReportView } from './components/ReportView';
import { ReportCenter } from './components/ReportCenter';
import { SafetyDataLab } from './components/SafetyDataLab';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal'; 
import { SystemIdentityModal } from './components/SystemIdentityModal';
import { TEAMS } from './constants';
import { StorageDB } from './utils/storageDB';
import { TBMEntry, TeamOption, MonthlyRiskAssessment, SafetyGuideline, SiteConfig } from './types';
import { Database, Loader2 } from 'lucide-react';

// [UPDATED] Restore Progress Overlay Component
const RestoreOverlay = ({ progress }: { progress: number }) => {
    return createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in text-white">
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping opacity-20"></div>
                        <Database size={48} className="text-emerald-400 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-black mb-2">System Restoring...</h3>
                    <p className="text-sm text-slate-400 mb-6 text-center">데이터베이스 트랜잭션 기록 중...<br/>안전한 저장을 위해 브라우저를 닫지 마세요.</p>
                    
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold flex justify-between w-full">
                        <span>Serializing & Saving...</span>
                        <span>{progress}% Complete</span>
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
};

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [entries, setEntries] = useState<TBMEntry[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>(TEAMS);
  const [assessments, setAssessments] = useState<MonthlyRiskAssessment[]>([]);
  const [signatures, setSignatures] = useState<{ safety: string | null; site: string | null }>({ safety: null, site: null });
  
  // [NEW] Site Config State
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
      siteName: '용인 푸르지오 원클러스터 2,3단지',
      managerName: '박성훈 부장',
      userApiKey: null
  });
  
  const [reportTargetEntries, setReportTargetEntries] = useState<TBMEntry[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false); 
  
  const [isRestoring, setIsRestoring] = useState(false); 
  const [restoreProgress, setRestoreProgress] = useState(0); 

  const [editingEntry, setEditingEntry] = useState<TBMEntry | null>(null);
  const [entryMode, setEntryMode] = useState<'ROUTINE' | 'BATCH'>('ROUTINE');

  useEffect(() => {
    const loadData = async () => {
        // 1. Critical Config (Sync Load priority)
        const storedConfig = localStorage.getItem('siteConfig');
        if (storedConfig) {
            try {
                setSiteConfig(JSON.parse(storedConfig));
            } catch (e) { console.error("Config parse error"); }
        }

        // 2. Data Load
        const storedEntries = await StorageDB.get<TBMEntry[]>('entries');
        if (storedEntries) setEntries(storedEntries);
        
        const storedAssessments = await StorageDB.get<MonthlyRiskAssessment[]>('assessments');
        if (storedAssessments) setAssessments(storedAssessments);
        
        const storedSignatures = await StorageDB.get<{ safety: string | null; site: string | null }>('signatures');
        if (storedSignatures) setSignatures(storedSignatures);

        const storedTeams = await StorageDB.get<TeamOption[]>('teams');
        if (storedTeams && storedTeams.length > 0) {
            setTeams(storedTeams);
        } else {
            await StorageDB.set('teams', TEAMS);
            setTeams(TEAMS);
        }
    };
    loadData();
  }, []);

  const handleSaveEntry = async (data: TBMEntry | TBMEntry[], shouldExit = true) => {
      let updatedEntries = [...entries];
      if (Array.isArray(data)) {
          updatedEntries = [...data, ...entries];
      } else {
          const existingIndex = entries.findIndex(e => e.id === data.id);
          if (existingIndex >= 0) {
              updatedEntries[existingIndex] = data;
          } else {
              updatedEntries = [data, ...entries];
          }
      }
      setEntries(updatedEntries);
      await StorageDB.set('entries', updatedEntries);
      if (shouldExit) {
        setCurrentView('dashboard');
        setEditingEntry(null);
      }
      return true;
  };

  const handleRequestDelete = async (id: string) => {
      if (confirm('정말 삭제하시겠습니까?')) {
          const updated = entries.filter(e => e.id !== id);
          setEntries(updated);
          await StorageDB.set('entries', updated);
      }
  };

  const handleBulkDelete = async (ids: string[]) => {
      if (ids.length === 0) return;
      if (confirm(`선택한 ${ids.length}건의 데이터를 영구 삭제하시겠습니까?\n(이 작업은 되돌릴 수 없습니다)`)) {
          const updated = entries.filter(e => !ids.includes(e.id));
          setEntries(updated);
          await StorageDB.set('entries', updated);
      }
  };

  const handleSaveAssessment = async (data: MonthlyRiskAssessment[]) => {
      setAssessments(data);
      await StorageDB.set('assessments', data);
  };

  const handleUpdateSignature = async (role: 'safety' | 'site', dataUrl: string) => {
      const newSigs = { ...signatures, [role]: dataUrl };
      setSignatures(newSigs);
      await StorageDB.set('signatures', newSigs);
  };

  // [NEW] Update Site Config
  const handleUpdateSiteConfig = (newConfig: SiteConfig) => {
      setSiteConfig(newConfig);
      localStorage.setItem('siteConfig', JSON.stringify(newConfig));
  };

  const handleAddTeam = async (name: string, category: string) => {
      const newTeam: TeamOption = {
          id: `team-${Date.now()}`,
          name: name,
          category: category
      };
      const updatedTeams = [...teams, newTeam];
      setTeams(updatedTeams);
      await StorageDB.set('teams', updatedTeams);
  };

  const handleDeleteTeam = async (id: string) => {
      if (!confirm("팀을 삭제하시겠습니까? (기존 일지 데이터는 유지됩니다)")) return;
      const updatedTeams = teams.filter(t => t.id !== id);
      setTeams(updatedTeams);
      await StorageDB.set('teams', updatedTeams);
  };

  const handleBackupData = (scope: 'ALL' | 'TBM' | 'RISK') => {
      const backupData: any = {
          version: '3.1.0',
          backupDate: new Date().toISOString(),
          scope: scope
      };

      if (scope === 'ALL' || scope === 'TBM') {
          backupData.entries = entries;
      }
      if (scope === 'ALL' || scope === 'RISK') {
          backupData.assessments = assessments;
      }
      if (scope === 'ALL') {
          backupData.teams = teams;
          backupData.signatures = signatures;
          // [SECURITY FIX] Exclude API key from backup file to prevent credential leakage
          const { userApiKey: _stripped, ...siteConfigSafe } = siteConfig;
          backupData.siteConfig = siteConfigSafe;
      }

      const suffix = scope === 'ALL' ? 'FULL' : scope === 'TBM' ? 'TBM_LOGS' : 'RISK_DATA';
      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SAPA_${suffix}_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  // [FIXED] Soft-Refresh Restore Logic (No Page Reload)
  const handleRestoreData = async (files: FileList) => {
      // [FIX] Guard against oversized or excessive files to prevent OOM
      const MAX_FILE_SIZE_MB = 50;
      const MAX_FILE_COUNT = 20;
      if (files.length > MAX_FILE_COUNT) {
          alert(`⚠️ 한 번에 최대 ${MAX_FILE_COUNT}개의 파일만 처리할 수 있습니다.`);
          return;
      }
      for (let i = 0; i < files.length; i++) {
          if (files[i].size > MAX_FILE_SIZE_MB * 1024 * 1024) {
              alert(`⚠️ 파일 크기 제한 초과: "${files[i].name}"\n최대 ${MAX_FILE_SIZE_MB}MB 파일만 복구 가능합니다.`);
              return;
          }
      }
      setIsRestoring(true);
      setRestoreProgress(0);

      // Temporary storage for merge
      let mergedEntries = [...entries];
      let mergedAssessments = [...assessments];
      let mergedTeams = [...teams];
      let mergedSignatures = { ...signatures };
      let mergedConfig = { ...siteConfig };
      
      let totalFound = 0;

      try {
          const fileArray = Array.from(files);
          
          for (let i = 0; i < fileArray.length; i++) {
              const file = fileArray[i];
              const text = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => resolve("{}");
                  reader.readAsText(file);
              });

              try {
                  const json = JSON.parse(text);
                  
                  // Strategy 1: Standard Backup Format (Object with keys)
                  if (!Array.isArray(json)) {
                      let fileFound = false;
                      if (Array.isArray(json.entries)) {
                          const validEntries = json.entries.filter((e: any) => e && (e.date || e.id));
                          mergedEntries = [...validEntries, ...mergedEntries]; 
                          totalFound += validEntries.length;
                          fileFound = true;
                      }
                      if (Array.isArray(json.assessments)) {
                          const validAss = json.assessments.filter((a: any) => a && a.month);
                          // [SANITIZE] Ensure ID exists for legacy data
                          validAss.forEach((a: any) => {
                              if (!a.id) a.id = `LEGACY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              if (!Array.isArray(a.priorities)) a.priorities = [];
                          });
                          mergedAssessments = [...validAss, ...mergedAssessments];
                          totalFound += validAss.length;
                          fileFound = true;
                      }
                      if (Array.isArray(json.teams)) {
                          const existingIds = new Set(mergedTeams.map(t => t.id));
                          json.teams.forEach((t: any) => {
                              if (!existingIds.has(t.id)) {
                                  mergedTeams.push(t);
                                  totalFound++;
                              }
                          });
                          fileFound = true;
                      }
                      if (json.signatures) {
                          mergedSignatures = { ...mergedSignatures, ...json.signatures };
                      }
                      if (json.siteConfig) {
                          mergedConfig = { ...mergedConfig, ...json.siteConfig };
                      }
                      
                      // Fallback: If no standard keys, search recursively for arrays
                      if (!fileFound) {
                          Object.keys(json).forEach(key => {
                              if (Array.isArray(json[key]) && json[key].length > 0) {
                                  const arr = json[key];
                                  const first = arr[0];
                                  if (first.workDescription || first.teamName) {
                                      mergedEntries = [...arr, ...mergedEntries];
                                      totalFound += arr.length;
                                  } else if (first.month && first.priorities) {
                                      // [SANITIZE]
                                      arr.forEach((a: any) => {
                                          if (!a.id) a.id = `LEGACY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                          if (!Array.isArray(a.priorities)) a.priorities = [];
                                      });
                                      mergedAssessments = [...arr, ...mergedAssessments];
                                      totalFound += arr.length;
                                  }
                              }
                          });
                      }
                  } 
                  // Strategy 2: Raw Array (Legacy TBM Array)
                  else if (Array.isArray(json) && json.length > 0) {
                      const first = json[0];
                      if (first.workDescription || first.teamName) {
                          mergedEntries = [...json, ...mergedEntries];
                          totalFound += json.length;
                      } else if (first.month && first.priorities) {
                          // [SANITIZE]
                          json.forEach((a: any) => {
                              if (!a.id) a.id = `LEGACY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                              if (!Array.isArray(a.priorities)) a.priorities = [];
                          });
                          mergedAssessments = [...json, ...mergedAssessments];
                          totalFound += json.length;
                      }
                  }
              } catch (e) {
                  console.warn("Skipping invalid file:", file.name);
              }
              
              setRestoreProgress(Math.round(((i + 1) / fileArray.length) * 50));
          }

          if (totalFound === 0) {
              alert("⚠️ 복구할 유효한 데이터가 파일에 없습니다.");
              setIsRestoring(false);
              return;
          }

          // De-duplicate Entries based on ID
          const uniqueEntryMap = new Map();
          mergedEntries.forEach(e => {
              // Ensure critical arrays are present (Data Sanitization)
              if (!Array.isArray(e.riskFactors)) e.riskFactors = [];
              if (!Array.isArray(e.safetyFeedback)) e.safetyFeedback = [];
              uniqueEntryMap.set(e.id, e);
          });
          const finalEntries = Array.from(uniqueEntryMap.values());

          // De-duplicate Assessments based on ID
          const uniqueAssMap = new Map();
          mergedAssessments.forEach(a => uniqueAssMap.set(a.id, a));
          const finalAssessments = Array.from(uniqueAssMap.values());

          setRestoreProgress(70);

          // Save to DB
          await StorageDB.set('entries', finalEntries);
          await StorageDB.set('assessments', finalAssessments);
          await StorageDB.set('teams', mergedTeams);
          await StorageDB.set('signatures', mergedSignatures);
          // Config saves to localStorage immediately
          localStorage.setItem('siteConfig', JSON.stringify(mergedConfig));

          setRestoreProgress(100);
          await new Promise(r => setTimeout(r, 800));

          // Soft Update (No Reload)
          setEntries(finalEntries);
          setAssessments(finalAssessments);
          setTeams(mergedTeams);
          setSignatures(mergedSignatures);
          setSiteConfig(mergedConfig);
          
          setIsRestoring(false);
          setIsSettingsOpen(false); // Close modal
          
          alert(`✅ 데이터 복구 완료!\n총 ${totalFound}건의 데이터가 처리되었습니다.`);
          setCurrentView('dashboard'); // Navigate to home

      } catch (err: any) {
          console.error("Critical Restore Error:", err);
          alert(`복구 중 치명적 오류 발생: ${err.message}`);
          setIsRestoring(false);
      }
  };

  // [NEW] Data Optimization: Robust Deduplication for TBM and Risk Assessments
  const handleOptimizeData = async () => {
      // 1. Optimize TBM Entries (Comparison: Date + Team + Time)
      const uniqueEntryMap = new Map<string, TBMEntry>();
      let duplicatesCount = 0;

      // Sort by Quality then Recency
      // Prioritize: Video > Photo > Recency
      const sortedEntries = [...entries].sort((a, b) => {
          const scoreA = (a.videoAnalysis ? 10 : 0) + (a.tbmPhotoUrl ? 5 : 0);
          const scoreB = (b.videoAnalysis ? 10 : 0) + (b.tbmPhotoUrl ? 5 : 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.createdAt || 0) - (a.createdAt || 0); // Newer wins
      });

      sortedEntries.forEach(entry => {
          // Normalize key to prevent whitespace mismatches
          const d = (entry.date || '').trim();
          const t = (entry.teamName || '').trim();
          const tm = (entry.time || '').trim();
          
          if (!d) return; // Skip invalid data

          const key = `${d}|${t}|${tm}`;
          if (uniqueEntryMap.has(key)) {
              duplicatesCount++;
          } else {
              uniqueEntryMap.set(key, entry);
          }
      });
      const optimizedEntries = Array.from(uniqueEntryMap.values());

      // 2. Optimize Risk Assessments (Comparison: Month + Type)
      const uniqueAssMap = new Map<string, MonthlyRiskAssessment>();
      let duplicatesAss = 0;
      
      // Filter out totally invalid ones (missing month)
      const validAssessments = assessments.filter(a => a && a.month);
      
      // Sort: Content Length > Newer
      // Keep the one with the most content (priorities)
      validAssessments.sort((a, b) => {
          const lenA = Array.isArray(a.priorities) ? a.priorities.length : 0;
          const lenB = Array.isArray(b.priorities) ? b.priorities.length : 0;
          if (lenB !== lenA) return lenB - lenA; // Keep one with more data
          return (b.createdAt || 0) - (a.createdAt || 0);
      });

      validAssessments.forEach(ass => {
          // Normalize Key: e.g., "2024-01|MONTHLY"
          const m = (ass.month || '').trim();
          const type = (ass.type || 'MONTHLY').trim();
          
          const key = `${m}|${type}`;
          
          if (uniqueAssMap.has(key)) {
              duplicatesAss++;
          } else {
              // Sanitize while we are here: Ensure ID and Priorities array exist
              const safeAss = { ...ass };
              if (!Array.isArray(safeAss.priorities)) safeAss.priorities = [];
              if (!safeAss.id) safeAss.id = `FIXED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              uniqueAssMap.set(key, safeAss);
          }
      });
      const optimizedAssessments = Array.from(uniqueAssMap.values());

      if (duplicatesCount === 0 && duplicatesAss === 0) {
          alert("삭제할 중복 데이터가 없습니다. 이미 최적화된 상태입니다.");
          return;
      }
      
      // Commit Changes
      await StorageDB.set('entries', optimizedEntries);
      await StorageDB.set('assessments', optimizedAssessments);
      
      // Update State Immediately
      setEntries(optimizedEntries);
      setAssessments(optimizedAssessments);
      
      alert(`✅ 최적화 완료!\n\n- TBM 일지 중복 제거: ${duplicatesCount}건\n- 위험성평가 중복 제거: ${duplicatesAss}건\n\n데이터베이스가 정리되었습니다.`);
  };

  const handleEditEntry = (entry: TBMEntry) => {
      setEditingEntry(entry);
      setEntryMode('ROUTINE');
      setCurrentView('new');
  };

  const monthlyGuidelines: SafetyGuideline[] = assessments.length > 0 ? assessments[0].priorities : [];

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans text-slate-900">
      {isRestoring && <RestoreOverlay progress={restoreProgress} />}
      
      <Navigation 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onShowHistory={() => setShowHistory(true)}
        onShowIdentity={() => setShowIdentity(true)} 
        onNewEntryClick={() => { setEditingEntry(null); setEntryMode('ROUTINE'); setCurrentView('new'); }}
      />
      
      <main className="flex-1 ml-0 md:ml-72 p-4 md:p-8 overflow-x-hidden">
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
            {(() => {
                switch (currentView) {
                  case 'new':
                    return <TBMForm 
                        onSave={handleSaveEntry} 
                        onCancel={() => setCurrentView('dashboard')}
                        monthlyGuidelines={monthlyGuidelines}
                        initialData={editingEntry || undefined}
                        onDelete={handleRequestDelete}
                        teams={teams}
                        mode={entryMode}
                    />;
                  case 'risk-assessment':
                    return <RiskAssessmentManager 
                        assessments={assessments} 
                        onSave={handleSaveAssessment}
                        onRestoreData={handleRestoreData} 
                    />;
                  case 'reports':
                    return <ReportCenter 
                        entries={entries} 
                        onOpenPrintModal={(targetEntries) => { setReportTargetEntries(targetEntries); setShowReportModal(true); }}
                        signatures={signatures}
                        teams={teams}
                        onDelete={handleRequestDelete} 
                        onBulkDelete={handleBulkDelete}
                    />;
                  case 'data-lab': 
                    return <SafetyDataLab 
                        entries={entries} 
                        teams={teams} 
                        onBackupData={handleBackupData} 
                        onRestoreData={handleRestoreData} 
                    />;
                  default:
                    return <Dashboard 
                        entries={entries}
                        siteName={siteConfig.siteName} // [NEW] Pass Config
                        onViewReport={() => { setReportTargetEntries(entries); setShowReportModal(true); }} 
                        onNavigateToReports={()=>setCurrentView('reports')} 
                        onNavigateToDataLab={()=>setCurrentView('data-lab')}
                        onNewEntry={()=>{setEditingEntry(null); setEntryMode('ROUTINE'); setCurrentView('new')}} 
                        onEdit={handleEditEntry} 
                        onOpenSettings={()=>setIsSettingsOpen(true)} 
                        onDelete={handleRequestDelete} 
                        onPrintSingle={(entry) => { setReportTargetEntries([entry]); setShowReportModal(true); }} 
                    />;
                }
            })()}
        </Suspense>
      </main>

      {showReportModal && (
          <ReportView 
            entries={reportTargetEntries} 
            teams={teams}
            siteName={siteConfig.siteName} // [NEW] Pass Config
            onClose={() => setShowReportModal(false)}
            signatures={signatures}
            onUpdateSignature={handleUpdateSignature}
            onEdit={(entry) => { setShowReportModal(false); handleEditEntry(entry); }}
            onDelete={async (id) => { await handleRequestDelete(id); setShowReportModal(false); }}
          />
      )}

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
      
      {showIdentity && <SystemIdentityModal onClose={() => setShowIdentity(false)} />}
      
      <SettingsModal 
         isOpen={isSettingsOpen} 
         onClose={() => setIsSettingsOpen(false)} 
         signatures={signatures}
         onUpdateSignature={handleUpdateSignature}
         teams={teams}
         onAddTeam={handleAddTeam}
         onDeleteTeam={handleDeleteTeam}
         onBackupData={handleBackupData}
         onRestoreData={handleRestoreData}
         onOptimizeData={handleOptimizeData}
         siteConfig={siteConfig} // [NEW] Pass Config
         onUpdateSiteConfig={handleUpdateSiteConfig} // [NEW] Handler
      />
    </div>
  );
};

export default App;