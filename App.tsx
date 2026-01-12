
import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom'; // [UPDATED] Import createPortal
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
import { TBMEntry, TeamOption, MonthlyRiskAssessment, SafetyGuideline } from './types';
import { Database, Loader2 } from 'lucide-react';

// [UPDATED] Restore Progress Overlay Component -> Now using Portal
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
                    <p className="text-sm text-slate-400 mb-6 text-center">데이터 무결성 검증 및 병합 중입니다.<br/>잠시만 기다려주세요.</p>
                    
                    <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold flex justify-between w-full">
                        <span>Verifying...</span>
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

  const handleSaveAssessment = async (data: MonthlyRiskAssessment[]) => {
      setAssessments(data);
      await StorageDB.set('assessments', data);
  };

  const handleUpdateSignature = async (role: 'safety' | 'site', dataUrl: string) => {
      const newSigs = { ...signatures, [role]: dataUrl };
      setSignatures(newSigs);
      await StorageDB.set('signatures', newSigs);
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

  // [UPDATED] Robust Restore with Visual Progress and Legacy Support
  const handleRestoreData = async (files: FileList) => {
      setIsRestoring(true);
      setRestoreProgress(0);

      const readFile = (file: File): Promise<any> => {
          return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                  try {
                      resolve(JSON.parse(e.target?.result as string));
                  } catch (err) {
                      console.warn(`Skipping invalid JSON: ${file.name}`);
                      resolve(null);
                  }
              };
              reader.onerror = reject;
              reader.readAsText(file);
          });
      };

      try {
          const fileArray = Array.from(files);
          let processedCount = 0;
          
          // Step 1: Read Files (10-30%)
          const fileContents = [];
          for (const file of fileArray) {
              const content = await readFile(file);
              if (content) fileContents.push(content);
              processedCount++;
              setRestoreProgress(Math.min(30, Math.round((processedCount / fileArray.length) * 30)));
          }

          if (fileContents.length === 0) {
              alert("유효한 백업 파일이 없습니다.");
              setIsRestoring(false);
              return;
          }

          setRestoreProgress(40);

          // Step 2: Merge Data (40-80%)
          const newEntriesMap = new Map<string, TBMEntry>();
          entries.forEach(e => newEntriesMap.set(e.id, e));

          const newAssMap = new Map<string, MonthlyRiskAssessment>();
          assessments.forEach(a => newAssMap.set(a.id, a));

          const newTeamMap = new Map<string, TeamOption>();
          teams.forEach(t => newTeamMap.set(t.id, t));

          let newSignatures = { ...signatures };

          // Helper to process any item array found regardless of structure
          const processItems = (items: any[]) => {
              items.forEach((item: any) => {
                  if (!item || typeof item !== 'object') return;

                  // 1. Risk Assessment Detection (Has Month & Priorities)
                  if (item.month && (item.priorities || item.type)) {
                       // Ensure ID exists
                       const id = item.id || `RESTORED-ASS-${Date.now()}-${Math.random()}`;
                       newAssMap.set(id, {
                           ...item,
                           id: id,
                           priorities: Array.isArray(item.priorities) ? item.priorities : []
                       });
                  }
                  // 2. Team Detection (Has Name & Category, No Date)
                  else if (item.name && item.category && !item.date) {
                       const id = item.id || `RESTORED-TEAM-${Date.now()}-${Math.random()}`;
                       newTeamMap.set(id, item);
                  }
                  // 3. TBM Entry Detection (Has Date & TeamName/WorkDescription) - Fallback
                  else if (item.date && (item.teamName || item.workDescription || item.teamId)) {
                       const id = item.id || `RESTORED-ENTRY-${Date.now()}-${Math.random()}`;
                       newEntriesMap.set(id, {
                          ...item,
                          id: id,
                          riskFactors: Array.isArray(item.riskFactors) ? item.riskFactors : [],
                          safetyFeedback: Array.isArray(item.safetyFeedback) ? item.safetyFeedback : [],
                          teamId: item.teamId || 'unknown',
                          teamName: item.teamName || 'Unknown Team'
                       });
                  }
              });
          };

          fileContents.forEach((rawData, idx) => {
              // Handle Raw Array inputs (Legacy backups)
              if (Array.isArray(rawData)) {
                  processItems(rawData);
              } else if (typeof rawData === 'object' && rawData !== null) {
                  // Handle Standard Object inputs
                  if (Array.isArray(rawData.entries)) processItems(rawData.entries);
                  if (Array.isArray(rawData.assessments)) processItems(rawData.assessments);
                  if (Array.isArray(rawData.teams)) processItems(rawData.teams);
                  
                  // Handle Unknown/Legacy Keys: Deep scan all array properties
                  Object.keys(rawData).forEach(key => {
                      if (['entries', 'assessments', 'teams', 'signatures', 'version', 'scope', 'backupDate'].includes(key)) return;
                      if (Array.isArray(rawData[key])) {
                          console.log(`Found legacy data array in key: ${key}`);
                          processItems(rawData[key]);
                      }
                  });

                  if (rawData.signatures) {
                      newSignatures = { ...newSignatures, ...rawData.signatures };
                  }
              }
              
              setRestoreProgress(40 + Math.round(((idx + 1) / fileContents.length) * 40));
          });

          setRestoreProgress(85);

          // Step 3: Commit to State & Storage (90-100%)
          const finalEntries = Array.from(newEntriesMap.values());
          const finalAssessments = Array.from(newAssMap.values());
          const finalTeams = Array.from(newTeamMap.values());

          setEntries(finalEntries);
          setAssessments(finalAssessments);
          setTeams(finalTeams);
          setSignatures(newSignatures);

          await StorageDB.set('entries', finalEntries);
          await StorageDB.set('assessments', finalAssessments);
          await StorageDB.set('teams', finalTeams);
          await StorageDB.set('signatures', newSignatures);

          setRestoreProgress(100);
          
          await new Promise(r => setTimeout(r, 800)); 
          alert(`✅ 총 ${files.length}개 파일 복구 완료!\n\n- TBM 일지: ${finalEntries.length}건\n- 위험성평가: ${finalAssessments.length}건\n- 팀 정보: ${finalTeams.length}건`);
          window.location.reload(); 

      } catch (err) {
          console.error("Bulk Restore Error:", err);
          alert("데이터 병합 중 오류가 발생했습니다.");
      } finally {
          setIsRestoring(false);
      }
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
                    />;
                  case 'reports':
                    return <ReportCenter 
                        entries={entries} 
                        onOpenPrintModal={() => { setReportTargetEntries(entries); setShowReportModal(true); }}
                        signatures={signatures}
                        teams={teams}
                        onDelete={handleRequestDelete} 
                    />;
                  case 'data-lab': 
                    return <SafetyDataLab 
                        entries={entries} 
                        teams={teams} 
                        onBackupData={handleBackupData} // [NEW] Pass Backup handler
                        onRestoreData={handleRestoreData} // [NEW] Pass Restore handler
                    />;
                  default:
                    return <Dashboard 
                        entries={entries} 
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
      />
    </div>
  );
};

export default App;
