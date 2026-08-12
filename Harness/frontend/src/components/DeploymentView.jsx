import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, Zap, Loader2, Users, ShieldCheck, Activity, RefreshCw } from 'lucide-react';

const DeploymentView = ({ theme, onShowToast }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await axios.get('/api/agents');
      setAgents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleScale = async (agentId, currentCount, delta) => {
    const newCount = Math.max(0, Math.min(10, currentCount + delta));
    try {
      await axios.post(`/api/agents/${agentId}/scale?count=${newCount}`);
      fetchAgents();
      if (onShowToast) {
        onShowToast(`⚡ 에이전트 동시 가동 유닛이 ${newCount}개로 조율되었습니다. (DB 반영 완료)`);
      }
    } catch (err) {
      alert('에이전트 배치 스케일링 오류');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  const agentList = Array.isArray(agents) ? agents : [];
  const totalInstances = agentList.reduce((sum, a) => sum + (a.instances || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 space-y-6">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white backdrop-blur-md">
                HUMAN-IN-THE-LOOP FLEET
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Agent Fleet Manager & Concurrency Control
            </h2>
            <p className="text-blue-100 text-xs mt-1">
              하네스 엔지니어링 핵심 아키텍처: 전문 AI 에이전트 군단 배치 및 동시성(Concurrency) 조율 관제
            </p>
          </div>

          <div className="flex items-center gap-6 bg-black/20 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="text-center">
              <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-0.5">Active Fleet Units</p>
              <p className="text-3xl font-black text-white">{totalInstances}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mb-0.5">System Health</p>
              <p className="text-3xl font-black text-emerald-400">100%</p>
            </div>
          </div>
        </div>
        <Zap className="absolute -right-6 -bottom-6 w-36 h-36 text-white/5 rotate-12" />
      </div>

      {/* ── Agent Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {agentList.map(agent => (
          <div
            key={agent.id}
            className={`${theme.card} p-6 rounded-3xl border ${theme.border} shadow-xl hover:border-blue-500/40 transition-all duration-300 group relative space-y-4`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-3.5 rounded-2xl ${agent.instances > 0 ? 'bg-blue-600 shadow-lg shadow-blue-600/30' : 'bg-slate-800'} transition-all`}>
                  <Cpu className={`w-6 h-6 ${agent.instances > 0 ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div>
                  <h4 className={`font-black text-base ${theme.title} tracking-tight`}>{agent.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-2 h-2 rounded-full ${agent.instances > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className={`text-[10px] font-bold ${agent.instances > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {agent.instances > 0 ? `ACTIVE (${agent.instances} Units)` : 'STANDBY'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Concurrency Unit Controller */}
              <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                <button
                  onClick={() => handleScale(agent.id, agent.instances, -1)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all text-xs font-bold"
                >
                  -
                </button>
                <span className={`text-sm font-mono font-black min-w-[24px] text-center ${theme.title}`}>
                  {agent.instances}
                </span>
                <button
                  onClick={() => handleScale(agent.id, agent.instances, 1)}
                  disabled={agent.instances >= 10}
                  className="w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-xs font-bold shadow-md disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${theme.desc} min-h-[36px]`}>
              {agent.description}
            </p>

            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 uppercase tracking-wider">Worker Load & Capacity</span>
                <span className={theme.title}>{agent.load}%</span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    agent.load > 80 ? 'bg-orange-500' : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, agent.load)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeploymentView;
