import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, Video, Brain, TrendingUp, Settings, LogOut, Zap, ShieldCheck, Terminal, 
  ChevronRight, Activity, Menu, X, Sun, Moon, Palette, Cpu, Layers, CheckCircle2, 
  AlertCircle, Clock, UserCog, HardDrive, Save, Check, Loader2, FileText, Plus, Minus
} from 'lucide-react';

const themes = {
  dark: { bg: 'bg-black', sidebar: 'bg-black', card: 'bg-[#0a0a0a]', title: 'text-white', desc: 'text-slate-400', muted: 'text-slate-600', border: 'border-white/10', header: 'bg-black/80' },
  light: { bg: 'bg-white', sidebar: 'bg-slate-50', card: 'bg-white', title: 'text-slate-900', desc: 'text-slate-600', muted: 'text-slate-400', border: 'border-slate-200', header: 'bg-white/80' },
  harness: { bg: 'bg-[#020617]', sidebar: 'bg-[#0f172a]', card: 'bg-[#1e293b]', title: 'text-white', desc: 'text-slate-300', muted: 'text-slate-500', border: 'border-cyan-900/30', header: 'bg-[#020617]/80' }
};

const Toast = ({ message, visible, onClose }) => {
  if (!visible) return null;
  return (
    <div className="fixed top-6 right-6 z-[100] animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-blue-400/30">
        <div className="bg-white/20 p-1 rounded-full"><Check className="w-4 h-4 text-white" /></div>
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

const DeploymentView = ({ theme, onShowToast }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await axios.get('/api/agents');
      setAgents(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleScale = async (agentId, currentCount, delta) => {
    const newCount = Math.max(0, Math.min(10, currentCount + delta));
    try {
      await axios.post(`/api/agents/${agentId}/scale?count=${newCount}`);
      fetchAgents();
      onShowToast(`에이전트 배치가 ${newCount}명으로 조정되었습니다.`);
    } catch (err) { alert('오류'); }
  };

  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  const agentList = Array.isArray(agents) ? agents : [];
  const totalInstances = agentList.reduce((sum, a) => sum + (a.instances || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] p-10 mb-12 shadow-2xl shadow-blue-900/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div><h2 className="text-4xl font-black text-white mb-3 tracking-tight">에이전트 배치 시스템</h2><p className="text-blue-100 font-medium">하네스 플랫폼의 지능형 에이전트들을 실시간으로 배포하고 관리합니다.</p></div>
          <div className="flex items-center gap-10"><div className="text-center"><p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Active Units</p><p className="text-5xl font-black text-white">{totalInstances}</p></div><div className="h-12 w-px bg-white/20"></div><div className="text-center"><p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">System Health</p><p className="text-5xl font-black text-emerald-400">99%</p></div></div>
        </div>
        <Zap className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {agentList.map(agent => (
          <div key={agent.id} className={`${theme.card} p-10 rounded-[2.5rem] border ${theme.border} shadow-xl hover:shadow-2xl hover:border-blue-500/40 transition-all duration-500 group relative`}>
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-3xl ${agent.instances > 0 ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-slate-800'} transition-all duration-500 group-hover:scale-110`}><Cpu className={`w-10 h-10 ${agent.instances > 0 ? 'text-white' : 'text-slate-500'}`} /></div>
                <div><h4 className={`font-black text-2xl ${theme.title} tracking-tight`}>{agent.name}</h4><div className="flex items-center gap-2 mt-1"><span className={`w-2 h-2 rounded-full ${agent.instances > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span><span className={`text-xs font-bold ${agent.instances > 0 ? 'text-green-500' : 'text-slate-500'}`}>{agent.instances > 0 ? 'OPERATIONAL' : 'SYSTEM OFFLINE'}</span></div></div>
              </div>
              <div className="flex items-center gap-4 bg-black/30 p-2 rounded-2xl border border-white/5">
                <button onClick={() => handleScale(agent.id, agent.instances, -1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-all text-xl font-bold">-</button>
                <span className={`text-2xl font-black min-w-[30px] text-center ${theme.title}`}>{agent.instances}</span>
                <button onClick={() => handleScale(agent.id, agent.instances, 1)} disabled={agent.instances >= 10} className="w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-xl transition-all text-xl font-bold text-white shadow-lg">+</button>
              </div>
            </div>
            <p className={`text-sm leading-relaxed mb-10 h-12 overflow-hidden ${theme.desc}`}>{agent.description}</p>
            <div className="space-y-4">
              <div className="flex justify-between items-end"><span className={`text-[10px] font-black uppercase tracking-widest ${theme.muted}`}>Workload Efficiency</span><span className={`text-sm font-bold ${theme.title}`}>{agent.load}%</span></div>
              <div className={`w-full h-3 ${theme.bg} rounded-full overflow-hidden border ${theme.border} p-0.5`}><div className={`h-full rounded-full transition-all duration-1000 ${agent.load > 80 ? 'bg-orange-500' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}`} style={{ width: `${agent.load}%` }}></div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConsoleView = ({ theme }) => {
  const [logs, setLogs] = useState([{ agent: 'SYSTEM', message: 'Harness Kernel v2.1.0 Ready.', level: 'INFO', time: new Date().toLocaleTimeString() }]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const eventSource = new EventSource('/api/stream/logs');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLogs(prev => [...prev, { ...data, time: new Date().toLocaleTimeString() }].slice(-50));
    };
    return () => eventSource.close();
  }, []);

  const getLogColor = (level) => {
    switch(level) {
      case 'SUCCESS': return 'text-emerald-400';
      case 'ERROR': return 'text-red-400';
      case 'PROCESS': return 'text-blue-400';
      case 'WARNING': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className={`text-3xl font-bold mb-2 ${theme.title}`}>Agent Console</h2><p className={theme.desc}>에이전트 군단의 사고 과정을 실시간 모니터링합니다.</p></div>
        <div className="bg-black border border-slate-800 rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl">
          <div className="flex flex-col"><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Session Cost</span><span className="text-xl font-black text-emerald-400 font-mono">$0.0425</span></div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="flex flex-col text-right"><span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Usage Status</span><span className="text-xs font-bold text-blue-500">LIVE STREAMING</span></div>
        </div>
      </div>
      <div className="bg-[#050505] border border-slate-800 rounded-[2.5rem] p-10 font-mono text-sm shadow-2xl h-[650px] flex flex-col relative group">
        <div className="flex-1 overflow-y-auto space-y-2 mb-6 scrollbar-hide">
          {logs.map((log, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300"><span className="text-slate-600 mr-3">[{log.time}]</span><span className={`font-bold mr-3 ${log.agent === 'SYSTEM' ? 'text-purple-400' : 'text-blue-500'}`}>[{log.agent}]</span><span className={getLogColor(log.level)}>{log.message}</span></div>
          ))}
        </div>
        <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 group-focus-within:border-blue-500/50 transition-all"><span className="text-blue-500 font-black tracking-widest px-2">ROOT@HARNESS:~$</span><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setLogs(prev => [...prev, { agent: 'USER', message: input, level: 'INFO', time: new Date().toLocaleTimeString() }]); setInput(''); } }} placeholder="명령어를 입력하세요..." className="flex-1 bg-transparent border-none focus:outline-none text-white font-medium" /><Terminal className="text-slate-600 w-5 h-5" /></div>
      </div>
    </div>
  );
};

const SettingsView = ({ theme, currentTheme, changeTheme, onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useState('Professional');
  const [prompt, setPrompt] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [outputPath, setOutputPath] = useState('/Projects/Harness/exports/videos');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        if (res.data.agent_persona) setPersona(res.data.agent_persona);
        if (res.data.agent_prompt) setPrompt(res.data.agent_prompt);
        if (res.data.schedule_time) setScheduleTime(res.data.schedule_time);
        if (res.data.output_path) setOutputPath(res.data.output_path);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/settings', { settings: { agent_persona: persona, agent_prompt: prompt, schedule_time: scheduleTime, output_path: outputPath } });
      onShowToast('설정이 데이터베이스에 저장되었습니다.');
    } catch (err) { alert('오류'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  const isDark = currentTheme === 'dark' || currentTheme === 'harness';
  const selectStyle = { backgroundColor: isDark ? '#000000' : '#ffffff', color: isDark ? '#ffffff' : '#000000', borderColor: isDark ? '#333333' : '#cccccc' };
  const optionStyle = { backgroundColor: isDark ? '#111111' : '#ffffff', color: isDark ? '#ffffff' : '#000000' };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className={`text-3xl font-bold mb-2 ${theme.title}`}>시스템 설정</h2><p className={theme.desc}>실시간 관리자 패널입니다.</p></div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? '저장' : '설정 저장하기'}</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}>
          <div className="flex items-center gap-3 mb-6"><UserCog className="text-blue-500" /><h3 className={`text-xl font-bold ${theme.title}`}>에이전트 페르소나</h3></div>
          <div className="space-y-6">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>말투</label>
              <select value={persona} onChange={(e) => setPersona(e.target.value)} style={selectStyle} className="w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-bold cursor-pointer">
                <option value="Professional" style={optionStyle}>💼 전문적인 분석가</option>
                <option value="Friendly" style={optionStyle}>😊 친절한 AI</option>
                <option value="Humorous" style={optionStyle}>🤣 유머러스</option>
                <option value="MZ" style={optionStyle}>🔥 MZ 트렌드</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>지침</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={selectStyle} className="w-full p-4 rounded-xl border h-32 focus:outline-none focus:ring-2 focus:ring-blue-500/40" placeholder="규칙 입력..." />
            </div>
          </div>
        </section>
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}><div className="flex items-center gap-3 mb-6"><Clock className="text-orange-500" /><h3 className={`text-xl font-bold ${theme.title}`}>스케줄러</h3></div><div className="space-y-6"><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} style={selectStyle} className="w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-bold" /></div></section>
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}><div className="flex items-center gap-3 mb-6"><Palette className="text-purple-500" /><h3 className={`text-xl font-bold ${theme.title}`}>테마</h3></div><div className="grid grid-cols-3 gap-4"><button onClick={() => changeTheme('light')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${currentTheme === 'light' ? 'border-blue-500 bg-blue-500/5' : `border-slate-700/20 ${theme.desc}`}`}><Sun className="w-6 h-6 text-yellow-500" /><span className="text-xs font-bold">Light</span></button><button onClick={() => changeTheme('dark')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${currentTheme === 'dark' ? 'border-blue-500 bg-blue-500/5' : `border-slate-700/20 ${theme.desc}`}`}><Moon className="w-6 h-6 text-blue-400" /><span className="text-xs font-bold">Dark</span></button><button onClick={() => changeTheme('harness')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${currentTheme === 'harness' ? 'border-blue-500 bg-blue-500/5' : `border-slate-700/20 ${theme.desc}`}`}><Palette className="w-6 h-6 text-cyan-400" /><span className="text-xs font-bold">Harness</span></button></div></section>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [scriptResult, setScriptResult] = useState(null);
  const theme = themes[currentTheme];

  useEffect(() => { const savedTheme = localStorage.getItem('harness-theme'); if (savedTheme) setCurrentTheme(savedTheme); }, []);
  const changeTheme = (newTheme) => { setCurrentTheme(newTheme); localStorage.setItem('harness-theme', newTheme); };
  const showToast = (message) => { setToast({ message, visible: true }); setTimeout(() => setToast({ ...toast, visible: false }), 3000); };
  const handleLogout = () => { localStorage.removeItem('token'); window.location.href = '/login'; };

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.title} flex overflow-hidden font-sans transition-colors duration-300`}>
      <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />
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
              <div><h4 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme.title}`}><FileText className="text-blue-500 w-5 h-5" /> 생성된 1 분 쇼츠 대본</h4><div className="bg-[#050505] p-8 rounded-3xl border border-white/5 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">{scriptResult.script}</div></div>
            </div>
            <div className="p-8 bg-white/5 border-t border-white/5 flex gap-4">
              <button onClick={() => setScriptResult(null)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all">닫기</button>
              <button onClick={async()=>{showToast('영상 렌더링 시작...'); try{await axios.post('/api/youtube/render',{topic:scriptResult.topic}); setScriptResult(null); setActiveTab('console');}catch{alert('오류');}}} className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"><Zap className="w-4 h-4 fill-current" /> 영상 렌더링 시작 (Beta)</button>
            </div>
          </div>
        </div>
      )}
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
            {activeTab === 'settings' && <SettingsView theme={theme} currentTheme={currentTheme} changeTheme={changeTheme} onShowToast={showToast} />}
            {activeTab === 'deployment' && <DeploymentView theme={theme} onShowToast={showToast} />}
            {activeTab === 'console' && <ConsoleView theme={theme} />}
            {activeTab === 'youtube' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
                <div className="flex justify-between items-center mb-10">
                  <div><h2 className={`text-3xl font-bold mb-2 ${theme.title}`}>YouTube Studio</h2><p className={theme.desc}>AI가 시장 데이터를 분석하여 대본을 기획합니다.</p></div>
                  <button onClick={async () => { showToast('에이전트 가동 시작...'); try { const res = await axios.post('/api/youtube/plan', {}); setScriptResult(res.data); } catch (err) { alert('오류'); } }} className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"><Zap className="w-5 h-5 fill-current" /> 자율 AI 기획 시작</button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-2xl`}>
                      <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${theme.title}`}><FileText className="text-blue-500" /> 생성된 대본 (Preview)</h3>
                      <div className="bg-black/40 rounded-2xl p-8 min-h-[400px] border border-slate-800/50"><p className={`whitespace-pre-wrap leading-relaxed ${theme.desc} italic`}>[기획 시작] 버튼을 누르면 에이전트가 작동합니다.</p></div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}>
                      <h4 className={`font-bold mb-6 ${theme.title}`}>에이전트 상태</h4>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between"><span className={`text-sm ${theme.desc}`}>활성 에이전트</span><span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-lg text-xs font-bold">Narrative-Architect</span></div>
                        <div className="flex items-center justify-between"><span className={`text-sm ${theme.desc}`}>데이터 소스</span><span className={`text-sm font-bold ${theme.title}`}>StockPlus DB</span></div>
                        <div className="pt-4 border-t border-slate-700/30"><div className="flex items-center gap-2 text-green-500"><Activity className="w-4 h-4 animate-pulse" /><span className="text-xs font-bold uppercase tracking-widest">Linked & Ready</span></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
