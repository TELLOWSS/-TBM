import React from 'react';
import { LayoutDashboard, PlusCircle, FileText, ShieldCheck, ChevronRight, Settings, Shield, Sparkles, History, Hexagon, User } from 'lucide-react';

interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenSettings: () => void;
  onShowHistory: () => void; 
  onShowIdentity: () => void; // New prop for philosophy
}

// Updated Logo: Geometric Monogram (Architectural)
const BrandLogo = () => (
  <div className="relative w-10 h-10 flex items-center justify-center">
     <div className="absolute inset-0 bg-blue-600 rounded-xl rotate-3 opacity-20"></div>
     <div className="absolute inset-0 bg-indigo-600 rounded-xl -rotate-3 opacity-20"></div>
     <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg border border-slate-700">
        <Hexagon size={24} strokeWidth={2.5} className="text-white"/>
        <div className="absolute w-2 h-2 bg-red-500 rounded-full top-2 right-2 border-2 border-slate-800"></div>
     </div>
  </div>
);

export const Navigation: React.FC<NavigationProps> = ({ currentView, setCurrentView, onOpenSettings, onShowHistory, onShowIdentity }) => {
  const navItems = [
    { id: 'dashboard', label: '통합 대시보드', sub: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'new', label: '스마트 TBM 등록', sub: 'Registration', icon: <PlusCircle size={20} /> },
    { id: 'risk-assessment', label: '위험성평가 관리', sub: 'Risk Management', icon: <ShieldCheck size={20} /> },
    { id: 'reports', label: '보고서 센터', sub: 'Archive', icon: <FileText size={20} /> },
  ];

  return (
    <>
      {/* Mobile Bottom Nav (Glass) */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/20 px-6 py-3 flex justify-between md:hidden z-50 no-print safe-area-bottom">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center gap-1 transition-all ${
              currentView === item.id ? 'text-blue-600 scale-105' : 'text-slate-400'
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-bold">{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 transition-colors text-slate-400"
        >
          <Settings size={20} />
          <span className="text-[10px] font-bold">설정</span>
        </button>
      </div>

      {/* Desktop Sidebar - Midnight Steel Theme */}
      <div className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 no-print bg-[#0F172A] text-slate-300 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.3)] overflow-hidden border-r border-slate-800">
        
        {/* Architectural Noise Texture on Sidebar too */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`}}></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        {/* 1. Header */}
        <div className="p-8 relative z-10">
          <div className="flex items-center gap-4 mb-2">
             <BrandLogo />
             <div>
               <h1 className="font-black text-xl leading-none text-white tracking-tight mb-1 font-sans">HUIGANG</h1>
               <span className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase block">Construction OS</span>
             </div>
          </div>
        </div>
        
        {/* 2. Navigation List */}
        <div className="flex-1 px-4 py-2 relative z-10 overflow-y-auto custom-scrollbar space-y-1">
          <p className="text-[10px] font-extrabold text-slate-600 px-4 mb-3 uppercase tracking-widest">Main Module</p>
          
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`
                  w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-900/40 to-slate-900/40 border border-blue-500/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'hover:bg-white/5 hover:text-white border border-transparent'
                  }
                `}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl"></div>}
                <div className="flex items-center gap-3.5 pl-1">
                  <span className={`transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {item.icon}
                  </span>
                  <div className="flex flex-col items-start">
                    <span className={`text-sm font-bold leading-none mb-0.5 ${isActive ? 'text-white' : 'text-slate-300'}`}>{item.label}</span>
                    <span className={`text-[9px] font-medium tracking-wide uppercase ${isActive ? 'text-blue-300' : 'text-slate-600'}`}>
                      {item.sub}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          <div className="pt-8 px-1">
             <div className="rounded-xl bg-gradient-to-br from-indigo-950/80 to-slate-900/80 border border-indigo-500/20 p-5 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                        <Sparkles size={16} className="animate-pulse"/>
                        <span className="text-[10px] font-black uppercase tracking-widest">AI Vision Core</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                       현장 영상을 <span className="text-indigo-300 font-bold">실시간 분석</span>하여<br/>
                       잠재 위험을 예측합니다.
                    </p>
                </div>
             </div>
          </div>
        </div>
        
        {/* 3. Footer Profile - UPGRADED DESIGN */}
        <div className="p-4 relative z-10 border-t border-slate-800/50 bg-[#0B1120]">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group mb-1" onClick={onOpenSettings}>
             <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 font-bold text-xs overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 shadow-inner">
                   <User size={18} className="text-slate-300"/>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 w-3 h-3 rounded-full border-2 border-[#0B1120]"></div>
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">박성훈 부장</p>
                <p className="text-[10px] text-slate-500 truncate">안전관리팀 / Head</p>
             </div>
             <Settings size={16} className="text-slate-600 group-hover:text-slate-300 transition-colors"/>
          </div>
          
          <div className="flex justify-between items-center px-1">
              <button onClick={onShowHistory} className="text-[10px] text-slate-600 font-bold hover:text-slate-400 transition-colors flex items-center gap-1">
                 <History size={10}/> v2.8.0
              </button>
              <button onClick={onShowIdentity} className="text-[10px] text-slate-600 font-bold hover:text-blue-400 transition-colors tracking-widest uppercase">
                 System Identity
              </button>
          </div>
        </div>
      </div>
    </>
  );
};