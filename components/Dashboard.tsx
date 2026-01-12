
import React, { useMemo, useState, useEffect } from 'react';
import { TBMEntry } from '../types';
import { Calendar, Users, AlertCircle, FileText, BarChart2, TrendingUp, ShieldAlert, Trash2, Radio, CloudRain, Sun, CloudSnow, MapPin, ArrowRight, ShieldCheck, Zap, Activity, Microscope, Clock, Siren, Megaphone, CheckCircle2, AlertTriangle, Wind, Droplets } from 'lucide-react';

interface DashboardProps {
  entries: TBMEntry[];
  onViewReport: () => void;
  onNavigateToReports: () => void;
  onNavigateToDataLab: () => void; 
  onNewEntry: () => void; 
  onEdit: (entry: TBMEntry) => void;
  onOpenSettings: () => void;
  onDelete: (id: string) => void; 
  onPrintSingle: (entry: TBMEntry) => void; 
}

// --- [Component 1] Live Field Clock ---
const LiveClock = () => {
    const [time, setTime] = useState<Date>(new Date());

    useEffect(() => {
        // [SYSTEM DATE OVERRIDE] 2026-01-13
        // Calculate the offset between current system time and target date
        const now = new Date();
        const targetDate = new Date(2026, 0, 13, now.getHours(), now.getMinutes(), now.getSeconds());
        const offset = targetDate.getTime() - now.getTime();

        const updateClock = () => {
            setTime(new Date(Date.now() + offset));
        };

        updateClock(); // Initial set
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Format: 2026.01.13 (Tue) 14:30:05
    const dateStr = time.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' });
    const timeStr = time.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div className="flex flex-col items-end">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> KST (한국 표준시)
            </div>
            <div className="flex items-baseline gap-2 text-slate-700">
                <span className="text-sm font-bold">{dateStr}</span>
                <span className="text-xl font-black font-mono tracking-tight">{timeStr}</span>
            </div>
        </div>
    );
};

// --- [Component 2] Site Weather Station ---
const WeatherStation = () => {
    // Default to a winter scenario suitable for Jan 2026
    const [weather, setWeather] = useState({ temp: -3, condition: 'Snow', wind: 4.2, humidity: 45 });
    
    // Derived Risk Level based on weather
    const riskLevel = useMemo(() => {
        if (weather.temp <= -10) return { level: 'CRITICAL', msg: '작업 중지 검토 (한파)' };
        if (weather.temp <= 0) return { level: 'WARNING', msg: '콘크리트 양생 질식 주의' };
        if (weather.condition === 'Rain') return { level: 'WARNING', msg: '미끄럼/감전 주의' };
        if (weather.wind >= 10) return { level: 'CRITICAL', msg: '타워크레인 작업 중지' };
        return { level: 'NORMAL', msg: '통상 작업 가능' };
    }, [weather]);

    return (
        <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm h-full flex flex-col justify-between relative overflow-hidden group">
            {/* Dynamic Status Bar */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${riskLevel.level === 'CRITICAL' ? 'bg-red-500' : riskLevel.level === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

            <div className="flex justify-between items-start z-10">
                <div>
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <MapPin size={12} />
                        <span className="text-xs font-bold">용인 푸르지오 2,3단지</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">{weather.temp}°</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-600">{weather.condition === 'Snow' ? '눈 (강설)' : weather.condition === 'Rain' ? '비 (우천)' : '맑음'}</span>
                            <span className="text-[10px] text-slate-400">체감온도 {(weather.temp - 2).toFixed(1)}°</span>
                        </div>
                    </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl">
                    {weather.condition === 'Snow' ? <CloudSnow size={28} className="text-sky-400"/> : 
                     weather.condition === 'Rain' ? <CloudRain size={28} className="text-blue-400"/> : 
                     <Sun size={28} className="text-amber-500"/>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 z-10">
                <div className="bg-slate-50 rounded-xl p-2 flex items-center gap-2">
                    <Wind size={14} className="text-slate-400"/>
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold">풍속</p>
                        <p className="text-xs font-black text-slate-700">{weather.wind} m/s</p>
                    </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 flex items-center gap-2">
                    <Droplets size={14} className="text-slate-400"/>
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold">습도</p>
                        <p className="text-xs font-black text-slate-700">{weather.humidity}%</p>
                    </div>
                </div>
            </div>

            {/* Risk Message */}
            <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 ${riskLevel.level === 'NORMAL' ? 'bg-emerald-50 text-emerald-700' : riskLevel.level === 'WARNING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                {riskLevel.level === 'NORMAL' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0"/> : <AlertTriangle size={16} className="mt-0.5 shrink-0 animate-pulse"/>}
                <div className="flex-1">
                    <p className="text-[10px] font-black uppercase mb-0.5">SITE ALERT LEVEL: {riskLevel.level}</p>
                    <p className="text-xs font-bold leading-tight">{riskLevel.msg}</p>
                </div>
            </div>

            {/* Hidden Controls for Demo */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border shadow-sm rounded-lg p-1 flex gap-1 z-20">
                 <button onClick={() => setWeather({ temp: -3, condition: 'Snow', wind: 4.2, humidity: 45 })} className="w-5 h-5 flex items-center justify-center text-[10px] hover:bg-slate-100 rounded">❄️</button>
                 <button onClick={() => setWeather({ temp: 15, condition: 'Rain', wind: 2.1, humidity: 80 })} className="w-5 h-5 flex items-center justify-center text-[10px] hover:bg-slate-100 rounded">🌧️</button>
                 <button onClick={() => setWeather({ temp: 24, condition: 'Sun', wind: 1.5, humidity: 30 })} className="w-5 h-5 flex items-center justify-center text-[10px] hover:bg-slate-100 rounded">☀️</button>
            </div>
        </div>
    );
};

// --- [Component 3] Big Action Button ---
const CommandActionCard = ({ onClick }: { onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="w-full h-full bg-slate-900 rounded-[24px] p-6 text-left relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-slate-200 flex flex-col justify-between border-2 border-slate-900"
    >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
        
        <div className="relative z-10 flex justify-between items-start">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-900/50 group-hover:bg-indigo-500 transition-colors">
                <Megaphone size={28} className="animate-pulse-slow"/>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-300">SYSTEM READY</span>
            </div>
        </div>

        <div className="relative z-10 mt-4">
            <h2 className="text-3xl font-black text-white leading-tight tracking-tight mb-2">
                스마트 TBM<br/>지휘 시작
            </h2>
            <p className="text-sm text-slate-400 font-medium">
                금일 작업 위험성평가 기반<br/>
                <span className="text-indigo-400">AI 안전 점검</span> 및 기록화
            </p>
        </div>

        <div className="relative z-10 mt-6 flex items-center gap-3">
            <div className="h-10 px-5 bg-white text-slate-900 rounded-xl flex items-center gap-2 font-black text-sm group-hover:bg-indigo-50 transition-colors">
                START <ArrowRight size={16} />
            </div>
        </div>
    </button>
);

// --- [Component 4] KPI Metrics ---
const KpiCard = ({ icon, label, value, unit, trend, colorClass }: any) => (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">{value}</span>
                <span className="text-xs font-bold text-slate-500">{unit}</span>
            </div>
        </div>
        <div className={`p-3 rounded-xl ${colorClass}`}>
            {icon}
        </div>
    </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ entries, onViewReport, onNavigateToReports, onNavigateToDataLab, onNewEntry, onEdit, onDelete }) => {
    
    // [SYSTEM DATE OVERRIDE] 2026-01-13
    const today = '2026-01-13';
    
    // Stats
    const todaysEntries = entries.filter(e => e.date === today);
    const riskCount = todaysEntries.reduce((acc, curr) => acc + (curr.riskFactors?.length || 0), 0);
    const workerCount = todaysEntries.reduce((acc, curr) => acc + (curr.attendeesCount || 0), 0);
    
    // Chart Teams
    const chartLabels = ['형틀1팀', '철근팀', '알폼팀', '갱폼팀', '직영팀'];
    // Mock Data matched to 5 teams
    const chartData = [8, 9, 7, 6, 8];
    
    return (
        <div className="space-y-6 pb-20 animate-fade-in font-sans text-slate-800">
            
            {/* 1. Top Header (Status Bar) */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 pb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="text-indigo-600" size={24}/>
                        현장 통합 관제 센터
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                        Site Command Center • Safety Monitoring System (v4.0.0)
                    </p>
                </div>
                <LiveClock />
            </div>

            {/* 2. Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-auto">
                
                {/* Left: Weather Station (4 cols) */}
                <div className="lg:col-span-4 h-[320px] lg:h-auto">
                    <WeatherStation />
                </div>

                {/* Center: Main Command (4 cols) */}
                <div className="lg:col-span-4 h-[320px] lg:h-auto">
                    <CommandActionCard onClick={onNewEntry} />
                </div>

                {/* Right: Quick Stats & Shortcuts (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-4 h-full">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <KpiCard 
                            icon={<Users size={18} className="text-blue-600"/>}
                            label="금일 출력"
                            value={workerCount}
                            unit="명"
                            colorClass="bg-blue-50"
                        />
                        <KpiCard 
                            icon={<ShieldAlert size={18} className="text-red-600"/>}
                            label="위험 요인"
                            value={riskCount}
                            unit="건"
                            colorClass="bg-red-50"
                        />
                    </div>
                    
                    {/* Shortcut Buttons */}
                    <div className="flex-1 grid grid-cols-1 gap-3">
                        <button onClick={onNavigateToReports} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <FileText size={20}/>
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-sm text-slate-800">문서 보관소</h4>
                                    <p className="text-[10px] text-slate-500">법적 증빙 자료 관리</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-500"/>
                        </button>
                        
                        <button onClick={onNavigateToDataLab} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <Microscope size={20}/>
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-sm text-slate-800">데이터 연구소</h4>
                                    <p className="text-[10px] text-slate-500">안전 트렌드 분석</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500"/>
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Live Feed Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <BarChart2 size={18} className="text-indigo-500"/>
                            주간 팀별 참여 현황
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Last 7 Days</span>
                    </div>
                    <div className="h-32 flex items-end justify-between gap-4 px-4">
                        {chartData.map((val, i) => (
                            <div key={i} className="flex-1 bg-slate-100 rounded-t-lg relative group">
                                <div 
                                    className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-lg transition-all duration-1000 group-hover:bg-indigo-600"
                                    style={{ height: `${val * 10}%` }}
                                ></div>
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity">
                                    {val}회
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 px-4">
                        {chartLabels.map((label, i) => (
                            <span key={i} className="flex-1 text-center">{label}</span>
                        ))}
                    </div>
                </div>

                {/* Recent Activity List */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[300px] lg:h-auto overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                            <Radio size={16} className="text-red-500 animate-pulse"/> 실시간 활동 ({today.slice(5)})
                        </h3>
                        <span className="bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">{todaysEntries.length}건</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {todaysEntries.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                <Clock size={24} className="opacity-20"/>
                                <span className="text-xs">금일 활동 기록이 없습니다.</span>
                            </div>
                        ) : (
                            todaysEntries.slice(0, 10).map((entry) => (
                                <div key={entry.id} className="p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                        {entry.tbmPhotoUrl ? (
                                            <img src={entry.tbmPhotoUrl} className="w-full h-full object-cover" alt="tbm"/>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300"><FileText size={16}/></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-bold text-slate-700 truncate">{entry.teamName}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{entry.time}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 truncate">{entry.workDescription || '내용 없음'}</p>
                                    </div>
                                    <button 
                                        onClick={() => onDelete(entry.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
