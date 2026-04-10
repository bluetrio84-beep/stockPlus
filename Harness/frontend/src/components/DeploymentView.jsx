import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Zap, Loader2 } from 'lucide-react';

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

export default DeploymentView;
