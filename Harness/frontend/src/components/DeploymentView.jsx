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
      {/* 상단 요약 바 크기 축소 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 mb-8 shadow-2xl shadow-blue-900/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div><h2 className="text-2xl font-black text-white mb-1 tracking-tight">에이전트 배치 시스템</h2><p className="text-blue-100 text-xs font-medium">실시간 배포 및 관리 유닛</p></div>
          <div className="flex items-center gap-6"><div className="text-center"><p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Active</p><p className="text-3xl font-black text-white">{totalInstances}</p></div><div className="h-8 w-px bg-white/20"></div><div className="text-center"><p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Health</p><p className="text-3xl font-black text-emerald-400">99%</p></div></div>
        </div>
        <Zap className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 rotate-12" />
      </div>

      {/* 카드 크기 대폭 축소 (grid 확장 및 패딩 축소) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agentList.map(agent => (
          <div key={agent.id} className={`${theme.card} p-5 rounded-3xl border ${theme.border} shadow-lg hover:shadow-xl hover:border-blue-500/40 transition-all duration-300 group relative`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${agent.instances > 0 ? 'bg-blue-600' : 'bg-slate-800'} transition-all duration-300 group-hover:scale-105`}><Cpu className={`w-5 h-5 ${agent.instances > 0 ? 'text-white' : 'text-slate-500'}`} /></div>
                <div><h4 className={`font-black text-sm ${theme.title} tracking-tight`}>{agent.name}</h4><div className="flex items-center gap-1.5 mt-0.5"><span className={`w-1.5 h-1.5 rounded-full ${agent.instances > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span><span className={`text-[9px] font-bold ${agent.instances > 0 ? 'text-green-500' : 'text-slate-500'}`}>{agent.instances > 0 ? 'LIVE' : 'OFFLINE'}</span></div></div>
              </div>
              <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/5">
                <button onClick={() => handleScale(agent.id, agent.instances, -1)} className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all text-xs font-bold">-</button>
                <span className={`text-sm font-black min-w-[20px] text-center ${theme.title}`}>{agent.instances}</span>
                <button onClick={() => handleScale(agent.id, agent.instances, 1)} disabled={agent.instances >= 10} className="w-6 h-6 flex items-center justify-center bg-blue-600 hover:bg-blue-500 rounded-lg transition-all text-xs font-bold text-white shadow-md">+</button>
              </div>
            </div>
            <p className={`text-[11px] leading-snug mb-4 h-8 overflow-hidden ${theme.desc}`}>{agent.description}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-end"><span className={`text-[8px] font-black uppercase tracking-widest ${theme.muted}`}>Load</span><span className={`text-[10px] font-bold ${theme.title}`}>{agent.load}%</span></div>
              <div className={`w-full h-1.5 ${theme.bg} rounded-full overflow-hidden border ${theme.border} p-0.5`}><div className={`h-full rounded-full transition-all duration-1000 ${agent.load > 80 ? 'bg-orange-500' : 'bg-gradient-to-r from-blue-600 to-cyan-400'}`} style={{ width: `${agent.load}%` }}></div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeploymentView;
