import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, FileText, Settings, LogOut, Zap, ShieldCheck, Terminal, 
  ChevronRight, Menu, X, List, Activity, BarChart3, HelpCircle
} from 'lucide-react';

// Sub-components
import ConsoleView from './ConsoleView';
import SettingsView from './SettingsView';
import BlogView from './BlogView';
import TaskQueueView from './TaskQueueView';
import AnalyticsView from './AnalyticsView';
import HarnessArchitectureGuide from './HarnessArchitectureGuide';

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
  const [isSidebarOpen, setSidebarOpen] = useState(false); // Mobile responsive default
  const [toast, setToast] = useState({ message: '', visible: false });
  const [harnessStatus, setHarnessStatus] = useState({ 'Blog-Publisher': { status: 'READY', sandbox: 'ONLINE' } });
  const theme = themes[currentTheme];

  useEffect(() => { const savedTheme = localStorage.getItem('harness-theme'); if (savedTheme) setCurrentTheme(savedTheme); }, []);
  const changeTheme = (newTheme) => { setCurrentTheme(newTheme); localStorage.setItem('harness-theme', newTheme); };
  const showToast = (message) => { setToast({ message, visible: true }); setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000); };
  const handleLogout = () => { localStorage.removeItem('token'); window.location.href = '/login'; };

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) setSidebarOpen(false); // Close sidebar on mobile tap
  };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.title} flex overflow-hidden font-sans transition-colors duration-300`}>
      <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />

      {/* Mobile Drawer Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 ${theme.sidebar} border-r ${theme.border} transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/30">
              <Zap className="w-6 h-6 text-white fill-current" />
            </div>
            <h1 className={`text-xl font-black tracking-tighter ${theme.title}`}>
              HARNESS <span className="text-blue-500">ENG.</span>
            </h1>
          </div>

          <nav className="flex-1 space-y-1.5 pr-1">
            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => handleNavClick('overview')} theme={theme} />
            <SidebarItem icon={HelpCircle} label="HE Guide (1~100)" active={activeTab === 'guide'} onClick={() => handleNavClick('guide')} badge="NEW" theme={theme} />
            <SidebarItem icon={Terminal} label="Agent Console" active={activeTab === 'console'} onClick={() => handleNavClick('console')} theme={theme} />
            
            <div className="pt-6 pb-2"><p className={`text-[10px] font-bold uppercase tracking-widest px-2 mb-3 ${theme.muted}`}>Active Harnesses</p></div>
            <SidebarItem icon={FileText} label="Quant Blog Engine" active={activeTab === 'blog'} onClick={() => handleNavClick('blog')} badge="v1.0" theme={theme} />
            <SidebarItem icon={List} label="Task Queue Manager" active={activeTab === 'queue'} onClick={() => handleNavClick('queue')} badge="KAIROS" theme={theme} />
            <SidebarItem icon={BarChart3} label="Quant Analytics" active={activeTab === 'analytics'} onClick={() => handleNavClick('analytics')} theme={theme} />
            
            <div className="pt-6 pb-2"><p className={`text-[10px] font-bold uppercase tracking-widest px-2 mb-3 ${theme.muted}`}>System</p></div>
            <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => handleNavClick('settings')} theme={theme} />
          </nav>

          <div className={`pt-4 border-t ${theme.border} mt-auto`}>
            <div className="flex items-center justify-between px-2 bg-slate-500/5 p-3 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className={`text-xs font-bold leading-none ${theme.title}`}>bluetrio</p>
                  <p className={`text-[10px] mt-1 ${theme.muted}`}>Admin</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className={`h-16 sm:h-20 border-b ${theme.border} ${theme.header} backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 flex-shrink-0 z-10`}>
          <div className="flex items-center gap-3">
            <button className={`lg:hidden p-2 ${theme.desc} hover:bg-slate-800 rounded-xl border border-white/10`} onClick={() => setSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className={`flex items-center gap-2 ${theme.desc} text-xs sm:text-sm font-medium capitalize`}>
              <span>Harness</span><ChevronRight className="w-3.5 h-3.5" /><span className={theme.title}>{activeTab}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'overview' && (
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                   <h2 className={`text-2xl sm:text-3xl font-bold ${theme.title}`}>전체 하네스 상태</h2>
                   <button
                     onClick={() => setActiveTab('guide')}
                     className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
                   >
                     <HelpCircle className="w-4 h-4" />
                     <span>HE 알고리즘 1~100 가이드 보기</span>
                   </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Quant Stock Auto-Blogger Card */}
                    <div className={`${theme.card} p-6 sm:p-8 rounded-3xl border ${theme.border} hover:border-blue-500/50 transition-all group shadow-lg relative overflow-hidden`}>
                      <div className="flex justify-between mb-6">
                        <div className="p-4 bg-blue-600 rounded-2xl shadow-xl shadow-blue-600/20"><FileText className="w-6 h-6 text-white" /></div>
                        <div className="text-right">
                          <span className={`flex items-center justify-end gap-1.5 text-[10px] font-black tracking-widest ${theme.title} mb-1`}>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            {harnessStatus['Blog-Publisher']?.status || 'READY'}
                          </span>
                          <p className={`text-[10px] font-bold ${theme.muted}`}>SANDBOX: ONLINE</p>
                        </div>
                      </div>
                      <h3 className={`text-lg sm:text-xl font-black mb-2 ${theme.title}`}>Quant Stock Auto-Blogger</h3>
                      <p className={`text-xs leading-relaxed ${theme.desc} mb-6`}>StockPlus 수급/테마 데이터를 기반으로 쌈빡한 전문 주식 분석 포스팅을 자동 생성하는 에이전트입니다.</p>
                      
                      <div className="flex gap-3">
                        <button onClick={() => setActiveTab('blog')} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all">Blog Engine 이동</button>
                      </div>
                    </div>

                    {/* Task Queue Manager Card */}
                    <div className={`${theme.card} p-6 sm:p-8 rounded-3xl border ${theme.border} hover:border-purple-500/50 transition-all group shadow-lg relative overflow-hidden`}>
                      <div className="flex justify-between mb-6">
                        <div className="p-4 bg-purple-600 rounded-2xl shadow-xl shadow-purple-600/20"><List className="w-6 h-6 text-white" /></div>
                        <div className="text-right">
                          <span className={`flex items-center justify-end gap-1.5 text-[10px] font-black tracking-widest ${theme.title} mb-1`}>
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                            KAIROS
                          </span>
                          <p className={`text-[10px] font-bold ${theme.muted}`}>CHOP-CHOP QUEUE</p>
                        </div>
                      </div>
                      <h3 className={`text-lg sm:text-xl font-black mb-2 ${theme.title}`}>Task Queue Manager</h3>
                      <p className={`text-xs leading-relaxed ${theme.desc} mb-6`}>모든 하네스 에이전트 작업 큐(task_queue)를 실시간 관제하고 수동 재시도 조율을 수행합니다.</p>
                      
                      <div className="flex gap-3">
                        <button onClick={() => setActiveTab('queue')} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all">Task Queue 관제 이동</button>
                      </div>
                    </div>

                    {/* Algorithm Guide Banner Card */}
                    <div className={`${theme.card} p-6 sm:p-8 rounded-3xl border ${theme.border} hover:border-cyan-500/50 transition-all group shadow-lg relative overflow-hidden`}>
                      <div className="flex justify-between mb-6">
                        <div className="p-4 bg-cyan-600 rounded-2xl shadow-xl shadow-cyan-600/20"><HelpCircle className="w-6 h-6 text-white" /></div>
                        <div className="text-right">
                          <span className="text-[10px] font-black tracking-widest text-cyan-400 mb-1 block">TUTORIAL</span>
                          <p className={`text-[10px] font-bold ${theme.muted}`}>1 TO 100 FLOW</p>
                        </div>
                      </div>
                      <h3 className={`text-lg sm:text-xl font-black mb-2 ${theme.title}`}>HE 알고리즘 가이드</h3>
                      <p className={`text-xs leading-relaxed ${theme.desc} mb-6`}>하네스 에이전트의 샌드박스 격리, KAIROS 자율 복구, 체이닝 5단계 동작 원리를 학습합니다.</p>
                      
                      <div className="flex gap-3">
                        <button onClick={() => setActiveTab('guide')} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all">알고리즘 가이드 열기</button>
                      </div>
                    </div>
                 </div>
               </div>
            )}
            {activeTab === 'guide' && <HarnessArchitectureGuide theme={theme} />}
            {activeTab === 'console' && <ConsoleView theme={theme} />}
            {activeTab === 'blog' && <BlogView theme={theme} onShowToast={showToast} />}
            {activeTab === 'queue' && <TaskQueueView theme={theme} onShowToast={showToast} />}
            {activeTab === 'analytics' && <AnalyticsView theme={theme} />}
            {activeTab === 'settings' && <SettingsView theme={theme} currentTheme={currentTheme} changeTheme={changeTheme} onShowToast={showToast} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
