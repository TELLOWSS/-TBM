
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCheck, Users, Database, Save, Upload, Download, Plus, Trash2, Settings, AlertTriangle, CheckCircle2, FileText, ShieldCheck, Layers, Loader2 } from 'lucide-react';
import { TeamOption, TeamCategory } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  signatures: { safety: string | null; site: string | null };
  onUpdateSignature: (role: 'safety' | 'site', dataUrl: string) => void;
  teams: TeamOption[];
  onAddTeam: (name: string, category: string) => void;
  onDeleteTeam: (id: string) => void;
  onBackupData: (scope: 'ALL' | 'TBM' | 'RISK') => void; 
  onRestoreData: (files: FileList) => void; 
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, signatures, onUpdateSignature, 
    teams, onAddTeam, onDeleteTeam, onBackupData, onRestoreData 
}) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState<'BASIC' | 'TEAMS' | 'DATA'>('BASIC');
    const [isBackingUp, setIsBackingUp] = useState(false); // [NEW] Loading state
    
    // Team Form State
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamCategory, setNewTeamCategory] = useState<string>(TeamCategory.FORMWORK);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const handleAddTeamSubmit = () => {
        if (!newTeamName.trim()) {
            alert('팀 이름을 입력해주세요.');
            return;
        }
        // [NEW] Duplicate Check
        if (teams.some(t => t.name.trim() === newTeamName.trim())) {
            alert('이미 존재하는 팀 이름입니다. 다른 이름을 사용해주세요.');
            return;
        }
        onAddTeam(newTeamName.trim(), newTeamCategory);
        setNewTeamName('');
    };

    // [NEW] Wrapper for Backup to show loading state
    const handleBackupClick = (scope: 'ALL' | 'TBM' | 'RISK') => {
        setIsBackingUp(true);
        setTimeout(() => {
            onBackupData(scope);
            setIsBackingUp(false);
        }, 300); // Simulate processing time for UX
    };

    const handleRestoreClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            if (confirm(`총 ${e.target.files.length}개의 파일에서 데이터를 복구하시겠습니까?\n\n[주의] 기존 데이터와 ID가 중복될 경우 백업 파일의 내용으로 덮어씌워집니다.`)) {
                onRestoreData(e.target.files);
            }
            e.target.value = ''; // Reset input
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-xl text-slate-600">
                            <Settings size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">환경 설정 (Settings)</h2>
                            <p className="text-xs text-slate-500 font-medium">시스템 운영에 필요한 기본 정보를 관리합니다.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6 gap-6">
                    {[
                        { id: 'BASIC', label: '기본 설정 (서명)', icon: <UserCheck size={16}/> },
                        { id: 'TEAMS', label: '팀/공종 관리', icon: <Users size={16}/> },
                        { id: 'DATA', label: '데이터 백업/복구', icon: <Database size={16}/> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
                                activeTab === tab.id 
                                ? 'border-indigo-600 text-indigo-600' 
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                    
                    {/* 1. Signatures */}
                    {activeTab === 'BASIC' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0 mt-0.5"><UserCheck size={16}/></div>
                                <div>
                                    <h4 className="text-sm font-bold text-blue-800 mb-1">전자 결재 서명 등록</h4>
                                    <p className="text-xs text-blue-600 leading-relaxed">
                                        등록된 서명은 모든 보고서 및 TBM 일지에 자동으로 적용됩니다.<br/>
                                        배경이 투명한 PNG 이미지를 권장합니다.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-slate-700">안전관리자 서명</label>
                                        {signatures.safety && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> 등록됨</span>}
                                    </div>
                                    <div className="aspect-[3/2] bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group hover:border-indigo-300 transition-colors">
                                        {signatures.safety ? (
                                            <img src={signatures.safety} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium">이미지 없음</span>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => onUpdateSignature('safety', ev.target?.result as string);
                                                reader.readAsDataURL(e.target.files[0]);
                                            }
                                        }}/>
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <span className="text-white text-xs font-bold">변경하기</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold text-slate-700">현장소장 서명</label>
                                        {signatures.site && <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> 등록됨</span>}
                                    </div>
                                    <div className="aspect-[3/2] bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden group hover:border-indigo-300 transition-colors">
                                        {signatures.site ? (
                                            <img src={signatures.site} className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <span className="text-xs text-slate-400 font-medium">이미지 없음</span>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => onUpdateSignature('site', ev.target?.result as string);
                                                reader.readAsDataURL(e.target.files[0]);
                                            }
                                        }}/>
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <span className="text-white text-xs font-bold">변경하기</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Teams */}
                    {activeTab === 'TEAMS' && (
                        <div className="space-y-6">
                            {/* Add Form */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Plus size={16} className="text-indigo-600"/> 신규 팀 등록
                                </h4>
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">공종 (Category)</label>
                                        <select 
                                            value={newTeamCategory}
                                            onChange={(e) => setNewTeamCategory(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:border-indigo-500"
                                        >
                                            {Object.values(TeamCategory).map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                            <option value="기타">기타 (직접입력)</option>
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">팀 명칭 (Team Name)</label>
                                        <input 
                                            type="text" 
                                            value={newTeamName}
                                            onChange={(e) => setNewTeamName(e.target.value)}
                                            placeholder="예: A동 형틀 1팀"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold outline-none focus:border-indigo-500"
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddTeamSubmit()}
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        <button 
                                            onClick={handleAddTeamSubmit}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors h-[34px]"
                                        >
                                            추가
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Team List */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">등록된 팀 목록 ({teams.length})</h4>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    {teams.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-xs">등록된 팀이 없습니다.</div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {teams.map((team) => (
                                                <div key={team.id} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{team.category}</span>
                                                        <span className="text-sm font-bold text-slate-800">{team.name}</span>
                                                    </div>
                                                    <button 
                                                        onClick={() => onDeleteTeam(team.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3. Data Backup/Restore */}
                    {activeTab === 'DATA' && (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                                <div className="bg-amber-100 p-2 rounded-full text-amber-600 shrink-0 mt-0.5"><AlertTriangle size={16}/></div>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800 mb-1">데이터 관리 주의사항</h4>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        브라우저 캐시 삭제 시 데이터가 유실될 수 있습니다.<br/>
                                        <strong>정기적으로 백업 파일을 다운로드하여 PC 또는 클라우드에 보관하세요.</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Export Section */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Download size={18} className="text-indigo-600"/> 데이터 백업 (Export)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <button 
                                            onClick={() => handleBackupClick('TBM')}
                                            disabled={isBackingUp}
                                            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isBackingUp ? <Loader2 size={24} className="animate-spin text-indigo-500"/> : <FileText size={24} className="text-slate-400 group-hover:text-indigo-500"/>}
                                            <span className="text-xs font-bold">TBM 일지 전용</span>
                                        </button>
                                        <button 
                                            onClick={() => handleBackupClick('RISK')}
                                            disabled={isBackingUp}
                                            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isBackingUp ? <Loader2 size={24} className="animate-spin text-amber-500"/> : <ShieldCheck size={24} className="text-slate-400 group-hover:text-amber-500"/>}
                                            <span className="text-xs font-bold">위험성평가 전용</span>
                                        </button>
                                        <button 
                                            onClick={() => handleBackupClick('ALL')}
                                            disabled={isBackingUp}
                                            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isBackingUp ? <Loader2 size={24} className="animate-spin text-emerald-500"/> : <Layers size={24} className="text-slate-400 group-hover:text-emerald-500"/>}
                                            <span className="text-xs font-bold">전체 통합 백업</span>
                                        </button>
                                    </div>
                                    {isBackingUp && <p className="text-[10px] text-slate-400 text-center mt-2 animate-pulse">데이터 패키징 중입니다...</p>}
                                </div>

                                {/* Import Section */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Upload size={18} className="text-emerald-600"/> 데이터 복구 (Import)
                                    </h3>
                                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 gap-3 hover:border-emerald-300 transition-colors">
                                        <Database size={32} className="text-emerald-200"/>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-600">백업 파일(.json)을 업로드하세요</p>
                                            <p className="text-xs text-slate-400 mt-1">통합 백업, 개별 백업 파일 모두 지원합니다. (다중 선택 가능)</p>
                                        </div>
                                        <button 
                                            onClick={() => restoreInputRef.current?.click()}
                                            className="mt-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                                        >
                                            파일 선택 및 복구
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={restoreInputRef} 
                                            className="hidden" 
                                            accept=".json"
                                            multiple
                                            onChange={handleRestoreClick}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-300 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-colors">
                        닫기
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
