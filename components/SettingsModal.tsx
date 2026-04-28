
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, UserCheck, Users, Database, Save, Upload, Download, Plus, Trash2, Settings, AlertTriangle, CheckCircle2, FileText, ShieldCheck, Layers, Loader2, FileSearch, Stethoscope, Sparkles, Eraser, Key, Server, Eye, EyeOff, HelpCircle, ExternalLink, Zap, Network } from 'lucide-react';
import { TeamOption, TeamCategory, SiteConfig } from '../types';
import { validateGeminiConnection } from '../services/geminiService';

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
  onOptimizeData: () => void;
  
  // [NEW] System Config Props
  siteConfig: SiteConfig;
  onUpdateSiteConfig: (config: SiteConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, signatures, onUpdateSignature, 
    teams, onAddTeam, onDeleteTeam, onBackupData, onRestoreData, onOptimizeData,
    siteConfig, onUpdateSiteConfig
}) => {
    // [FIX] Initialize with safe defaults to prevent undefined access
    const safeConfig = siteConfig || {
        siteName: '',
        managerName: '',
        userApiKey: null
    };

    const [activeTab, setActiveTab] = useState<'BASIC' | 'SYSTEM' | 'TEAMS' | 'DATA'>('BASIC');
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    // Config State
    const [configForm, setConfigForm] = useState<SiteConfig>(safeConfig);
    const [showApiKey, setShowApiKey] = useState(false);
    
    // [NEW] Connection Test State
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'SUCCESS' | 'FAILURE'>('IDLE');
    
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamCategory, setNewTeamCategory] = useState<string>(TeamCategory.FORMWORK);
    const restoreInputRef = useRef<HTMLInputElement>(null);
    const verifyInputRef = useRef<HTMLInputElement>(null);
    // [FIX] Mounted ref to prevent state update on unmounted component from delayed async handlers
    const mountedRef = useRef(true);

    // [FIX] Sync form with props when modal opens
    useEffect(() => {
        mountedRef.current = true;
        if (isOpen && siteConfig) {
            setConfigForm(siteConfig);
        }
        return () => { mountedRef.current = false; };
    }, [isOpen, siteConfig]);

    if (!isOpen) return null;

    const handleAddTeamSubmit = () => {
        if (!newTeamName.trim()) {
            alert('팀 이름을 입력해주세요.');
            return;
        }
        if (teams.some(t => t.name.trim() === newTeamName.trim())) {
            alert('이미 존재하는 팀 이름입니다. 다른 이름을 사용해주세요.');
            return;
        }
        onAddTeam(newTeamName.trim(), newTeamCategory);
        setNewTeamName('');
    };

    const handleBackupClick = (scope: 'ALL' | 'TBM' | 'RISK') => {
        setIsBackingUp(true);
        setTimeout(() => {
            onBackupData(scope);
            if (mountedRef.current) setIsBackingUp(false);
        }, 500); 
    };

    const onInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
        (e.target as HTMLInputElement).value = '';
    };

    const handleRestoreClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onRestoreData(files);
        }
    };

    const handleOptimizeClick = () => {
        if (confirm("데이터 최적화를 진행하시겠습니까?\n\n내용이 완벽히 동일한 중복 일지를 찾아 제거하고, 데이터 품질이 가장 높은 항목만 남깁니다.\n(주의: 삭제된 데이터는 복구할 수 없습니다.)")) {
            setIsOptimizing(true);
            setTimeout(() => {
                onOptimizeData();
                if (mountedRef.current) setIsOptimizing(false);
            }, 800);
        }
    };

    const handleVerifyClick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        setIsVerifying(true);

        setTimeout(async () => {
            try {
                let totalTbm = 0;
                let totalRisk = 0;
                let totalTeam = 0;
                let validFiles = 0;
                let errorCount = 0;

                const fileArray = Array.from(files) as File[];

                await Promise.all(fileArray.map(async (file) => {
                    try {
                        const text = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = () => reject(new Error("File read error"));
                            reader.readAsText(file);
                        });

                        if (!text) throw new Error("Empty file");
                        
                        let json;
                        try {
                            json = JSON.parse(text);
                        } catch {
                            throw new Error("Invalid JSON format");
                        }
                        
                        const countItems = (items: any) => Array.isArray(items) ? items.length : 0;

                        if (Array.isArray(json)) {
                            const tbmCount = json.filter((i:any) => i.workDescription || i.date || i.teamName).length;
                            const riskCount = json.filter((i:any) => i.month && i.priorities).length;
                            
                            totalTbm += tbmCount;
                            totalRisk += riskCount;
                            if (tbmCount > 0 || riskCount > 0) validFiles++;
                        } else {
                            let hasData = false;
                            if (json.entries) { totalTbm += countItems(json.entries); hasData = true; }
                            if (json.assessments) { totalRisk += countItems(json.assessments); hasData = true; }
                            if (json.teams) { totalTeam += countItems(json.teams); hasData = true; }
                            
                            if (!hasData) {
                                Object.keys(json).forEach(key => {
                                    if (Array.isArray(json[key])) {
                                        const arr = json[key];
                                        if (arr.length > 0) {
                                            const first = arr[0];
                                            if (first.workDescription || first.date) { totalTbm += arr.length; hasData = true; }
                                            else if (first.month && first.priorities) { totalRisk += arr.length; hasData = true; }
                                            else if (first.category && first.name) { totalTeam += arr.length; hasData = true; }
                                        }
                                    }
                                });
                            }
                            if (hasData || totalTbm > 0 || totalRisk > 0) validFiles++;
                        }
                    } catch (err: any) {
                        console.error(`File ${file.name} failed:`, err);
                        errorCount++;
                    }
                }));

                const report = `
✅ 파일 무결성 검사 결과
------------------------
• 검사 파일: ${fileArray.length}개
• 유효 파일: ${validFiles}개
• 오류 파일: ${errorCount}개

[발견된 데이터]
📋 TBM 일지: ${totalTbm}건
🛡️ 위험성평가: ${totalRisk}건
👷 팀 정보: ${totalTeam}건

${validFiles > 0 ? "데이터가 정상입니다. [데이터 복구] 버튼을 눌러 진행하세요." : "⚠️ 유효한 데이터 구조를 찾지 못했습니다."}
                `;
                alert(report);

            } catch (err: any) {
                console.error(err);
                alert(`❌ 검사 중 시스템 오류: ${err.message}`);
            } finally {
                if (mountedRef.current) setIsVerifying(false);
            }
        }, 300);
    };

    const handleTestConnection = async () => {
        const apiKey = configForm.userApiKey;
        if (!apiKey || apiKey.trim() === '') {
            alert("API Key를 입력해주세요.");
            return;
        }
        
        // [FIX] Validate prefix logic
        if (!apiKey.trim().startsWith('AIza')) {
            alert("API Key는 'AIza'로 시작해야 합니다. 올바른 키인지 확인해주세요.");
            return;
        }
        
        setIsTestingConnection(true);
        setConnectionStatus('IDLE');
        
        const success = await validateGeminiConnection(apiKey);
        
        setIsTestingConnection(false);
        setConnectionStatus(success ? 'SUCCESS' : 'FAILURE');
        
        if (success) {
            alert("✅ 연결 성공! 유효한 API Key입니다.");
        } else {
            alert("❌ 연결 실패. Key가 유효하지 않거나 네트워크 문제입니다.");
        }
    };

    const handleSaveConfig = () => {
        // [FIX] Trim whitespace automatically
        const trimmedKey = configForm.userApiKey ? configForm.userApiKey.trim() : null;
        
        if (trimmedKey && !trimmedKey.startsWith('AIza')) {
            if(!confirm("경고: API Key 형식이 올바르지 않아 보입니다. (AIza로 시작해야 함)\n그래도 저장하시겠습니까?")) return;
        }
        
        const cleanConfig = {
            ...configForm,
            userApiKey: trimmedKey
        };
        
        onUpdateSiteConfig(cleanConfig);
        alert("✅ 시스템 설정이 저장되었습니다.");
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                
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
                <div className="flex border-b border-slate-100 px-6 gap-6 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'BASIC', label: '기본 설정 (서명)', icon: <UserCheck size={16}/> },
                        { id: 'SYSTEM', label: '시스템 설정 (API/현장)', icon: <Server size={16}/> },
                        { id: 'TEAMS', label: '팀/공종 관리', icon: <Users size={16}/> },
                        { id: 'DATA', label: '데이터 백업/복구', icon: <Database size={16}/> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
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
                    
                    {/* 1. Basic (Signatures) */}
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
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onClick={onInputClick} onChange={(e) => {
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
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onClick={onInputClick} onChange={(e) => {
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

                    {/* 2. System Config (API Key, Site Info) */}
                    {activeTab === 'SYSTEM' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Setup Guide (Infographic) */}
                            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-500 p-2 rounded-lg text-white shadow-lg"><Key size={20}/></div>
                                            <div>
                                                <h3 className="text-lg font-black tracking-tight">API Key 발급 및 설정 가이드</h3>
                                                <p className="text-xs text-indigo-300 font-medium">Google Gemini Pro를 무료로 사용하기 위한 3단계</p>
                                            </div>
                                        </div>
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white text-indigo-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-50 transition-colors shadow-lg">
                                            <ExternalLink size={14}/> 발급 사이트 이동
                                        </a>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm relative group hover:bg-white/15 transition-colors">
                                            <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">STEP 1</div>
                                            <div className="flex justify-center mb-3 text-indigo-300"><Layers size={24}/></div>
                                            <p className="text-center text-xs font-bold leading-snug">Google AI Studio<br/>접속 및 로그인</p>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm relative group hover:bg-white/15 transition-colors">
                                            <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">STEP 2</div>
                                            <div className="flex justify-center mb-3 text-indigo-300"><Plus size={24}/></div>
                                            <p className="text-center text-xs font-bold leading-snug">Create API Key<br/>버튼 클릭</p>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-4 border border-white/10 backdrop-blur-sm relative group hover:bg-white/15 transition-colors">
                                            <div className="absolute -top-3 left-4 bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow">STEP 3</div>
                                            <div className="flex justify-center mb-3 text-indigo-300"><CheckCircle2 size={24}/></div>
                                            <p className="text-center text-xs font-bold leading-snug">생성된 Key 복사 후<br/>아래 입력창에 붙여넣기</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center gap-3 bg-indigo-900/50 p-3 rounded-xl border border-indigo-500/30">
                                        <Zap size={16} className="text-yellow-400 animate-pulse shrink-0"/>
                                        <p className="text-[10px] text-indigo-200 leading-relaxed font-medium">
                                            <span className="text-white font-bold">Why?</span> 무료 티어(Free Tier)는 개인 API 키를 사용할 때 가장 안정적입니다.
                                            공용 키 사용 시 <span className="text-red-300 underline decoration-red-300/50">사용량 초과(429 Error)</span>가 발생할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">현장명 (Project Name)</label>
                                    <input 
                                        type="text" 
                                        value={configForm.siteName}
                                        onChange={(e) => setConfigForm({...configForm, siteName: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="예: 용인 푸르지오 원클러스터"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">관리자 성명 (Manager)</label>
                                    <input 
                                        type="text" 
                                        value={configForm.managerName}
                                        onChange={(e) => setConfigForm({...configForm, managerName: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="예: 박성훈 부장"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Google Gemini API Key</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <input 
                                                type={showApiKey ? "text" : "password"} 
                                                value={configForm.userApiKey || ''}
                                                onChange={(e) => setConfigForm({...configForm, userApiKey: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pr-10 text-sm font-mono font-bold outline-none focus:border-indigo-500 transition-colors"
                                                placeholder="AIza..."
                                            />
                                            <button 
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                                            >
                                                {showApiKey ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                        <button 
                                            onClick={handleTestConnection}
                                            disabled={isTestingConnection}
                                            className={`px-4 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                                                connectionStatus === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                                connectionStatus === 'FAILURE' ? 'bg-red-50 border-red-200 text-red-600' :
                                                'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                                            }`}
                                        >
                                            {isTestingConnection ? <Loader2 size={16} className="animate-spin"/> : <Network size={16}/>}
                                            {isTestingConnection ? '확인 중...' : '연결 테스트'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <Lock size={10}/> 입력한 키는 브라우저 내부에만 안전하게 저장됩니다.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleSaveConfig}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                >
                                    <Save size={18}/> 설정 저장 및 적용
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 3. Teams */}
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

                    {/* 4. Data Backup/Restore */}
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

                                {/* Import & Verify Section */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Database size={18} className="text-emerald-600"/> 데이터 복구 및 검증
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Verify Button */}
                                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 gap-3 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                                            <Stethoscope size={32} className="text-slate-300 group-hover:text-blue-500"/>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-600 group-hover:text-blue-700">백업 파일 무결성 검사</p>
                                                <p className="text-[10px] text-slate-400 mt-1">복구 전 파일 정상 여부 확인 (다중 선택 가능)</p>
                                            </div>
                                            <button 
                                                onClick={() => verifyInputRef.current?.click()}
                                                disabled={isVerifying}
                                                className="mt-1 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:border-blue-300 hover:text-blue-600 shadow-sm flex items-center gap-2"
                                            >
                                                {isVerifying ? <Loader2 size={12} className="animate-spin"/> : <FileSearch size={12}/>} 
                                                파일 검사 실행
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={verifyInputRef} 
                                                className="hidden" 
                                                accept=".json"
                                                multiple
                                                onClick={onInputClick}
                                                onChange={handleVerifyClick}
                                            />
                                        </div>

                                        {/* Restore Button */}
                                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 gap-3 hover:border-emerald-300 hover:bg-emerald-50 transition-colors group">
                                            <Upload size={32} className="text-slate-300 group-hover:text-emerald-500"/>
                                            <div className="text-center">
                                                <p className="text-sm font-bold text-slate-600 group-hover:text-emerald-700">데이터 복구 (Restore)</p>
                                                <p className="text-[10px] text-slate-400 mt-1">기존 데이터를 덮어쓰거나 병합합니다.</p>
                                            </div>
                                            <button 
                                                onClick={() => restoreInputRef.current?.click()}
                                                className="mt-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-2"
                                            >
                                                <Database size={12}/> 
                                                복구 시작
                                            </button>
                                            <input 
                                                type="file" 
                                                ref={restoreInputRef} 
                                                className="hidden" 
                                                accept=".json"
                                                multiple
                                                onClick={onInputClick}
                                                onChange={handleRestoreClick}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* [NEW] Data Optimization Section */}
                                <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 shadow-inner group">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={18} className="text-violet-600"/>
                                            <h3 className="font-bold text-slate-800">데이터베이스 최적화</h3>
                                        </div>
                                        <button 
                                            onClick={handleOptimizeClick}
                                            disabled={isOptimizing}
                                            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                        >
                                            {isOptimizing ? <Loader2 size={14} className="animate-spin"/> : <Eraser size={14}/>}
                                            중복 제거 및 정리
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                                        여러 번의 복구로 인해 생성된 <strong>동일한 내용의 중복 데이터</strong>를 자동으로 검색하여 제거합니다.<br/>
                                        날짜, 시간, 팀명이 동일한 경우 품질이 높은(사진/AI분석 포함) 항목 1개만 남깁니다.
                                    </p>
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
