import React, { useMemo, useState, useEffect } from 'react';
import { TBMEntry } from '../types';
import { Calendar, Users, AlertCircle, FileText, BarChart2, TrendingUp, ShieldAlert, Trash2, Radio, CloudRain, Sun, CloudSnow, MapPin, ArrowRight, ShieldCheck, Zap, Activity, Microscope, Clock, Siren, Megaphone, CheckCircle2, AlertTriangle, Wind, Droplets, HardHat, RefreshCw, CloudLightning, Cloud, Medal } from 'lucide-react';

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

// --- [Component 0] Enhanced Sparkline Chart ---
const Sparkline = ({ 
    data, 
    color = "#6366f1", 
    height = 30, 
    width = 80, 
    type = 'area' 
}: { 
    data: number[], 
    color?: string, 
    height?: number, 
    width?: number, 
    type?: 'area' | 'line' 
}) => {
    if (!data || data.length < 2) {
        return (
            <div style={{ width, height }} className="bg-slate-50 rounded flex items-center justify-center">
                <span className="text-[9px] text-slate-300">-</span>
            </div>
        );
    }

    const max = Math.max(...data, 1);
    const min = 0;
    const range = max - min;
    
    // Calculate points
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const valAdjusted = isNaN(val) ? 0 : val;
        const y = height - ((valAdjusted - min) / range) * (height - 4) - 2; // Padding 2px
        return `${x},${y}`;
    }).join(" ");

    // For Area Fill
    const fillPath = `M 0,${height} L ${points} L ${width},${height} Z`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <defs>
                <linearGradient id={`grad-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
            </defs>
            {type === 'area' && <path d={fillPath} fill={`url(#grad-${color.replace('#','')})`} stroke="none" />}
            <polyline 
                points={points} 
                fill="none" 
                stroke={color} 
                strokeWidth={type === 'line' ? 2 : 1.5} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeDasharray={type === 'line' ? "0" : "0"} // Solid line
            />
            {/* End Dot */}
            {data.length > 0 && (
                <circle 
                    cx={width} 
                    cy={height - (( (isNaN(data[data.length-1])?0:data[data.length-1]) - min) / range) * (height - 4) - 2} 
                    r={type === 'line' ? 2.5 : 2} 
                    fill={color}
                />
            )}
        </svg>
    );
};

// --- [Component 1] Live Field Clock ---
const LiveClock = () => {
    const [time, setTime] = useState<Date>(new Date());

    useEffect(() => {
        const updateClock = () => {
            setTime(new Date());
        };

        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Format: 202X.XX.XX (Tue) 14:30:05
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

// --- [Component 1.5] Safety Campaign Banner ---
const SafetyCampaignBanner = () => {
    const slogans = [
        "안전은 구호가 아니라 실천입니다. 작업 전 TBM 필수!",
        "나의 안전이 가족의 행복입니다. 보호구 착용 철저!",
        "정리정돈 잘된 현장, 사고 없는 안전 현장",
        "서두르지 마세요. 안전보다 중요한 일정은 없습니다.",
        "위험요인 발견 즉시 작업 중지 및 관리자 보고"
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % slogans.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-3 shadow-lg shadow-orange-200 text-white flex items-center justify-between overflow-hidden relative mb-6">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="flex items-center gap-3 relative z-10 px-2">
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm animate-pulse">
                    <HardHat size={20} className="text-white"/>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-black bg-black/20 px-1.5 py-0.5 rounded w-fit mb-0.5 text-orange-100">SAFETY FIRST</span>
                    <span key={index} className="text-sm font-bold animate-slide-up-fade">
                        {slogans[index]}
                    </span>
                </div>
            </div>
            <div className="hidden md:flex relative z-10 gap-1 opacity-80">
                {slogans.map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-white scale-125' : 'bg-white/40'}`}></div>
                ))}
            </div>
        </div>
    );
};

// --- [Component 2] Site Weather Station ---
const WeatherStation = () => {
    // Initial fallback data
    const [weather, setWeather] = useState({ temp: 0, condition: 'Sun', wind: 0, humidity: 0 });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Fetch real weather from Open-Meteo API (Free, No Key required)
    // Coordinates for Yongin, South Korea: 37.241, 127.178
    const fetchRealWeather = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=37.241&longitude=127.178&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FSeoul');
            if (!response.ok) throw new Error("Weather API Error");
            
            const data = await response.json();
            const current = data.current;
            
            // Map WMO Weather Codes
            let condition = 'Sun';
            const code = current.weather_code;
            
            // 0: Clear, 1,2,3: Cloudy
            if (code === 0 || code === 1) condition = 'Sun';
            else if (code === 2 || code === 3 || code === 45 || code === 48) condition = 'Cloud';
            // 51-67: Drizzle/Rain, 80-82: Showers, 95-99: Thunderstorm
            else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) condition = 'Rain';
            // 71-77: Snow, 85-86: Snow showers
            else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) condition = 'Snow';

            setWeather({
                temp: Math.round(current.temperature_2m),
                humidity: current.relative_humidity_2m,
                wind: current.wind_speed_10m,
                condition: condition
            });
            setIsLoaded(true);
        } catch (error) {
            console.error("Failed to fetch weather:", error);
            // Minimal fallback if API fails
            setWeather(prev => ({ ...prev, temp: 20, condition: 'Sun' }));
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRealWeather();
        // Refresh every 15 minutes
        const interval = setInterval(fetchRealWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);
    
    // Derived Risk Level based on weather
    const riskLevel = useMemo(() => {
        if (weather.temp <= -10) return { level: 'CRITICAL', msg: '작업 중지 검토 (한파)' };
        if (weather.temp >= 33) return { level: 'WARNING', msg: '온열 질환 주의 (휴식)' };
        if (weather.condition === 'Rain') return { level: 'WARNING', msg: '미끄럼/감전 주의' };
        if (weather.condition === 'Snow') return { level: 'WARNING', msg: '결빙/미끄럼 주의' };
        if (weather.wind >= 10) return { level: 'CRITICAL', msg: '타워크레인 작업 중지' };
        return { level: 'NORMAL', msg: '통상 작업 가능' };
    }, [weather]);

    const handleRefresh = () => {
        if(isRefreshing) return;
        fetchRealWeather();
    };

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
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">
                            {isLoaded ? `${weather.temp}°` : '--'}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-600">
                                {!isLoaded ? '로딩중...' : 
                                weather.condition === 'Snow' ? '눈 (강설)' : 
                                weather.condition === 'Rain' ? '비 (우천)' : 
                                weather.condition === 'Cloud' ? '구름많음' : '맑음'}
                            </span>
                            {isLoaded && <span className="text-[10px] text-slate-400">체감온도 {(weather.temp - (weather.wind * 0.7)).toFixed(1)}°</span>}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                    <button 
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className={`p-2 rounded-full transition-all text-slate-400 hover:text-indigo-600 disabled:opacity-50 flex items-center gap-1 bg-slate-50 hover:bg-slate-100 ${isRefreshing ? 'ring-2 ring-indigo-100' : ''}`}
                        title="현장 기상 실시간 갱신"
                    >
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-indigo-500' : ''} />
                        <span className="text-[9px] font-bold text-slate-500">실시간</span>
                    </button>
                    <div className="p-3 bg-slate-50 rounded-2xl">
                        {weather.condition === 'Snow' ? <CloudSnow size={28} className="text-sky-400"/> : 
                        weather.condition === 'Rain' ? <CloudRain size={28} className="text-blue-400"/> : 
                        weather.condition === 'Cloud' ? <Cloud size={28} className="text-slate-400"/> :
                        <Sun size={28} className="text-amber-500"/>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 z-10">
                <div className="bg-slate-50 rounded-xl p-2 flex items-center gap-2">
                    <Wind size={14} className="text-slate-400"/>
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold">풍속</p>
                        <p className="text-xs font-black text-slate-700">{isLoaded ? `${weather.wind} m/s` : '-'}</p>
                    </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-2 flex items-center gap-2">
                    <Droplets size={14} className="text-slate-400"/>
                    <div>
                        <p className="text-[9px] text-slate-400 font-bold">습도</p>
                        <p className="text-xs font-black text-slate-700">{isLoaded ? `${weather.humidity}%` : '-'}</p>
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
    
    // [UPDATED] Use real system date for filtering
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Stats (Today)
    const todaysEntries = entries.filter(e => e.date === today);
    const riskCount = todaysEntries.reduce((acc, curr) => acc + (curr.riskFactors?.length || 0), 0);
    const workerCount = todaysEntries.reduce((acc, curr) => acc + (curr.attendeesCount || 0), 0);
    
    // [FIXED] Sparkline Chart Data Preparation (Detailed Metrics)
    const teamActivityData = useMemo(() => {
        // 1. Generate dates for last 7 days
        const last7Days = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().slice(0, 10);
        });

        // 2. Aggregate data by Team and Date
        const teamMap: Record<string, { 
            totalActivity: number, 
            totalRisks: number,
            scoreSum: number,
            scoreCount: number,
            dailyActivity: number[], 
            dailyRisks: number[],
            lastActive: string 
        }> = {};

        entries.forEach(e => {
            if (last7Days.includes(e.date)) {
                const teamName = e.teamName || '미지정';
                if (!teamMap[teamName]) {
                    teamMap[teamName] = { 
                        totalActivity: 0, totalRisks: 0, scoreSum: 0, scoreCount: 0,
                        dailyActivity: Array(7).fill(0), 
                        dailyRisks: Array(7).fill(0),
                        lastActive: '' 
                    };
                }
                
                const dateIndex = last7Days.indexOf(e.date);
                if (dateIndex !== -1) {
                    teamMap[teamName].dailyActivity[dateIndex] += 1;
                    teamMap[teamName].totalActivity += 1;
                    
                    const riskC = e.riskFactors?.length || 0;
                    teamMap[teamName].dailyRisks[dateIndex] += riskC;
                    teamMap[teamName].totalRisks += riskC;

                    // Safety Score Aggregation
                    if (e.videoAnalysis?.score) {
                        teamMap[teamName].scoreSum += e.videoAnalysis.score;
                        teamMap[teamName].scoreCount += 1;
                    }

                    // Keep track of latest activity
                    if (e.date > teamMap[teamName].lastActive) teamMap[teamName].lastActive = e.date;
                }
            }
        });

        // 3. Convert to Array and Sort by Total Activity
        const sortedTeams = Object.entries(teamMap)
            .map(([name, data]) => {
                const avgScore = data.scoreCount > 0 ? Math.round(data.scoreSum / data.scoreCount) : 0;
                let grade = '-';
                if (avgScore >= 90) grade = 'S';
                else if (avgScore >= 80) grade = 'A';
                else if (avgScore >= 70) grade = 'B';
                else if (avgScore > 0) grade = 'C';

                return { name, ...data, avgScore, grade };
            })
            .sort((a, b) => b.totalActivity - a.totalActivity)
            .slice(0, 5); // Top 5

        return sortedTeams;
    }, [entries]);
    
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
                        Site Command Center • Safety Monitoring System (v4.0.1)
                    </p>
                </div>
                <LiveClock />
            </div>

            {/* [NEW] Safety Campaign Banner */}
            <SafetyCampaignBanner />

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
                {/* Chart Section (Now with Detailed Sparklines) */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <BarChart2 size={18} className="text-indigo-500"/>
                            주간 팀별 활동 추이 (Trend)
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Last 7 Days</span>
                    </div>
                    
                    {/* [FIXED] Table Header */}
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-2 mb-2 px-2 uppercase tracking-wide">
                        <div className="col-span-4">Team / Rank</div>
                        <div className="col-span-3 text-center">Activity Trend</div>
                        <div className="col-span-3 text-center">Risk Discovery</div>
                        <div className="col-span-2 text-right">Overall Score</div>
                    </div>

                    {/* [FIXED] Sparkline List Visualization */}
                    <div className="flex flex-col gap-2">
                        {teamActivityData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <Activity size={24} className="mb-2 opacity-20"/>
                                <span className="text-xs">최근 7일간 데이터가 없습니다.</span>
                            </div>
                        ) : (
                            teamActivityData.map((team, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 hover:bg-slate-50 rounded-xl transition-colors group border border-transparent hover:border-slate-100">
                                    {/* Team Info */}
                                    <div className="col-span-4 flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${idx < 3 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-700 truncate">{team.name}</span>
                                            <span className="text-[9px] text-slate-400">Total {team.totalActivity}회</span>
                                        </div>
                                    </div>

                                    {/* Sparkline 1: Activity (Blue Area) */}
                                    <div className="col-span-3 h-8 flex justify-center">
                                        <Sparkline 
                                            data={team.dailyActivity} 
                                            color="#4f46e5" 
                                            height={32}
                                            width={100}
                                            type="area"
                                        />
                                    </div>

                                    {/* Sparkline 2: Risks (Red Line) */}
                                    <div className="col-span-3 h-8 flex justify-center">
                                        <Sparkline 
                                            data={team.dailyRisks} 
                                            color="#ef4444" 
                                            height={32}
                                            width={100}
                                            type="line"
                                        />
                                    </div>

                                    {/* Overall Score Badge */}
                                    <div className="col-span-2 text-right flex justify-end">
                                        {team.avgScore > 0 ? (
                                            <div className="flex flex-col items-end">
                                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black ${
                                                    team.grade === 'S' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                                                    team.grade === 'A' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    team.grade === 'B' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {team.grade === 'S' && <Medal size={10}/>}
                                                    <span>{team.avgScore}점</span>
                                                </div>
                                                <span className={`text-[9px] font-bold mt-0.5 ${
                                                    team.grade === 'S' || team.grade === 'A' ? 'text-slate-400' : 'text-red-400'
                                                }`}>
                                                    Grade {team.grade}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300">N/A</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Activity List */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[300px] lg:h-auto overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                            <Radio size={16} className="text-red-500 animate-pulse"/> 실시간 활동 (금일)
                        </h3>
                        <span className="bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">{todaysEntries.length}건</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {todaysEntries.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                                <Clock size={24} className="opacity-20"/>
                                <span className="text-xs font-bold">금일 작성된 일지가 없습니다.</span>
                                <span className="text-[10px] opacity-70">과거 기록은 '문서 보관소'에서 확인하세요.</span>
                            </div>
                        ) : (
                            todaysEntries.slice(0, 10).map((entry) => (
                                <div key={entry.id} className="p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center gap-3 group relative">
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(entry.id);
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="기록 삭제"
                                    >
                                        <Trash2 size={16}/>
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