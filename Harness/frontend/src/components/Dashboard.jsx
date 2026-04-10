import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, Video, TrendingUp, Settings, LogOut, Zap, ShieldCheck, Terminal, 
  ChevronRight, Menu, X, Layers
} from 'lucide-react';

// Sub-components
import DeploymentView from './DeploymentView';
import ConsoleView from './ConsoleView';
import SettingsView from './SettingsView';
import YouTubeView from './YouTubeView';

const themes = {
  dark: { bg: 'bg-[#000000]', sidebar: 'bg-[#000000]', card: 'bg-[#0a0a0a]', title: 'text-white', desc: 'text-slate-400', muted: 'text-slate-600', border: 'border-white/10', header: 'bg-black/80' },
  light: { bg: 'bg-white', sidebar: 'bg-slate-50', card: 'bg-white', title: 'text-slate-900', desc: 'text-slate-600', muted: 'text-slate-400', border: 'border-slate-200', header: 'bg-white/80' },
  harness: { bg: 'bg-[#020617]', sidebar: 'bg-[#0f172a]', card: 'bg-[#1e293b]', title: 'text-white', desc: 'text-slate-300', muted: 'text-slate-500', border: 'border-cyan-900/30', header: 'bg-[#020617]/80' }
};

const Toast = ({ message, visible, onClose }) => {
  if (!visible) return null;
  return (
    <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30">
        <div className="bg-white/20 p-1 rounded-full"><Zap className="w-4 h-4 text-white" /></div>
        <span className="font-bold text-sm">{message}</span>
        <button onClick={onClose} className="ml-4 opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick, badge, theme }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : `${theme.desc} hover:bg-blue-500/10 hover:text-blue-400`}`}>
    <div className="flex items-center gap-3"><Icon className={`w-5 h-5 ${active ? 'text-white' : ''}`} /><span className="font-medium text-sm">{label}</span></div>
    {badge && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>{badge}</span>}
  </button>
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [scriptResult, setScriptResult] = useState(null);
  const theme = themes[currentTheme];

  useEffect(() => { const savedTheme = localStorage.getItem('harness-theme'); if (savedTheme) setCurrentTheme(savedTheme); }, []);
  const changeTheme = (newTheme) => { setCurrentTheme(newTheme); localStorage.setItem('harness-theme', newTheme); };
  const showToast = (message) => { setToast({ message, visible: true }); setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000); };
  const handleLogout = () => { localStorage.removeItem('token'); window.location.href = '/login'; };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.title} flex overflow-hidden font-sans transition-colors duration-300`}>
      <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />
      
      {/* AI Script Modal */}
      {scriptResult && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 lg:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setScriptResult(null)}></div>
          <div className={`${theme.card} relative w-full max-w-4xl max-h-[85vh] border ${theme.border} rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300`}>
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-4"><div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-600/20"><Video className="w-6 h-6 text-white" /></div><div><h3 className={`text-2xl font-black ${theme.title}`}>AI 기획 리포트</h3><p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">Harness Engine v2.1 Alpha</p></div></div>
              <button onClick={() => setScriptResult(null)} className="p-3 hover:bg-white/10 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5"><p className={`text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2`}>Target Topic</p><p className={`font-bold ${theme.title}`}>{scriptResult.topic}</p></div>
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5"><p className={`text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2`}>Agent Persona</p><p className={`font-bold text-blue-400`}>{scriptResult.persona}</p></div>
              </div>
              <div><h4 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme.title}`}>생성된 대본</h4><div className={`bg-black/20 p-8 rounded-3xl border ${theme.border} font-mono text-sm leading-relaxed ${theme.desc} whitespace-pre-wrap`}>{scriptResult.script}</div></div>
            </div>
            <div className={`p-8 bg-black/20 border-t ${theme.border} flex gap-4`}>
              <button onClick={() => setScriptResult(null)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all">닫기</button>
              <button onClick={async()=>{showToast('영상 렌더링 시작...'); try{await axios.post('/api/youtube/render',{topic:scriptResult.topic}); setScriptResult(null); setActiveTab('console');}catch{alert('오류');}}} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"><Zap className="w-4 h-4 fill-current" /> 영상 렌더링 시작</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 ${theme.sidebar} border-r ${theme.border} transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2"><div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/30"><Zap className="w-6 h-6 text-white fill-current" /></div><h1 className={`text-xl font-black tracking-tighter ${theme.title}`}>HARNESS <span className="text-blue-500">ENG.</span></h1></div>
          <nav className="flex-1 space-y-2 pr-2">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} theme={theme} />
            <SidebarItem icon={Layers} label="AI Deployment" active={activeTab === 'deployment'} onClick={() => setActiveTab('deployment')} badge="HOT" theme={theme} />
            <SidebarItem icon={Terminal} label="Agent Console" active={activeTab === 'console'} onClick={() => setActiveTab('console')} theme={theme} />
            <div className="pt-8 pb-4"><p className={`text-[10px] font-bold uppercase tracking-widest px-2 mb-4 ${theme.muted}`}>Active Harnesses</p></div>
            <SidebarItem icon={Video} label="YouTube Studio" active={activeTab === 'youtube'} onClick={() => setActiveTab('youtube')} badge="ON" theme={theme} />
            <SidebarItem icon={TrendingUp} label="Trading Hub" active={activeTab === 'trading'} onClick={() => setActiveTab('trading')} theme={theme} />
            <div className="pt-8 pb-4"><p className={`text-[10px] font-bold uppercase tracking-widest px-2 mb-4 ${theme.muted}`}>System</p></div>
            <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} theme={theme} />
          </nav>
          <div className={`pt-6 border-t ${theme.border} mt-auto`}>
            <div className="flex items-center justify-between px-2 bg-slate-500/5 p-4 rounded-2xl">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-blue-400" /></div><div><p className={`text-sm font-bold leading-none ${theme.title}`}>bluetrio</p><p className={`text-[11px] mt-1 ${theme.muted}`}>Admin</p></div></div>
              <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className={`h-20 border-b ${theme.border} ${theme.header} backdrop-blur-xl flex items-center justify-between px-6 lg:px-10 flex-shrink-0`}>
          <div className="flex items-center gap-4">
            <button className={`lg:hidden p-2 ${theme.desc} hover:bg-slate-800 rounded-lg`} onClick={() => setSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? <X /> : <Menu />}</button>
            <div className={`flex items-center gap-2 ${theme.desc} text-sm font-medium capitalize`}><span>Harness</span><ChevronRight className="w-4 h-4" /><span className={theme.title}>{activeTab}</span></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <h2 className={`text-3xl font-bold mb-8 ${theme.title}`}>전체 하네스 상태</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} hover:border-blue-500/50 transition-all cursor-pointer group shadow-sm`}>
                      <div className="flex justify-between mb-6"><div className="p-4 bg-red-500 rounded-2xl shadow-lg"><Video className="w-6 h-6 text-white" /></div><span className={`flex items-center gap-1.5 text-xs font-bold ${theme.desc}`}><span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>ACTIVE</span></div>
                      <h3 className={`text-xl font-bold mb-2 ${theme.title}`}>YouTube Creator</h3><p className={`text-sm leading-relaxed ${theme.desc}`}>영상 트렌드 분석 및 AI 자동 편집 에이전트가 가동 중입니다.</p>
                    </div>
                 </div>
               </div>
            )}
            {activeTab === 'deployment' && <DeploymentView theme={theme} onShowToast={showToast} />}
            {activeTab === 'console' && <ConsoleView theme={theme} />}
            {activeTab === 'youtube' && <YouTubeView theme={theme} onShowToast={showToast} setScriptResult={setScriptResult} />}
            {activeTab === 'settings' && <SettingsView theme={theme} currentTheme={currentTheme} changeTheme={changeTheme} onShowToast={showToast} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
