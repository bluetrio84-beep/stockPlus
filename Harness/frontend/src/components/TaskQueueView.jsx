import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  List, Cpu, RefreshCw, CheckCircle2, AlertTriangle, Clock, Play, RotateCcw,
  Search, Code, Eye, FileText, Activity
} from 'lucide-react';

const TaskQueueView = ({ theme, onShowToast }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/tasks/queue');
      if (Array.isArray(res.data)) {
        setTasks(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch task queue", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetryTask = async (taskId) => {
    try {
      await axios.post(`/api/tasks/retry/${taskId}`);
      if (onShowToast) onShowToast(`🔄 Task #${taskId} PENDING 상태로 재등록 완료! (KAIROS 워커 재시도)`);
      fetchQueue();
    } catch (err) {
      if (onShowToast) onShowToast(`❌ 재시도 요청 실패: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchFilter = filter === 'ALL' || t.status === filter;
    const matchSearch = !search ||
      t.job_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.step_name?.toLowerCase().includes(search.toLowerCase()) ||
      String(t.task_id).includes(search);
    return matchFilter && matchSearch;
  });

  const getStatusBadge = (status) => {
    const map = {
      PENDING: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', Icon: Clock },
      RUNNING: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', Icon: Cpu },
      RETRY:   { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', Icon: RefreshCw },
      SUCCESS: { color: 'bg-green-500/20 text-green-400 border-green-500/30', Icon: CheckCircle2 },
      FAILED:  { color: 'bg-red-500/20 text-red-400 border-red-500/30', Icon: AlertTriangle },
    };
    const cfg = map[status] || map.PENDING;
    const Icon = cfg.Icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border ${cfg.color}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'RUNNING' ? 'animate-spin' : ''}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header Banner ── */}
      <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} shadow-xl`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl shadow-lg shadow-purple-600/20">
              <List className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme.title} flex items-center gap-2`}>
                Central Task Queue & KAIROS Monitor
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  REAL-TIME
                </span>
              </h2>
              <p className={`text-xs ${theme.desc} mt-1`}>
                Harness Engine의 전체 작업 큐(task_queue)를 실시간 모니터링하고 Self-Correction 조율을 수행합니다.
              </p>
            </div>
          </div>

          <button
            onClick={fetchQueue}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-white/10 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
          {['ALL', 'PENDING', 'RUNNING', 'RETRY', 'SUCCESS', 'FAILED'].map(st => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === st
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {st} ({st === 'ALL' ? tasks.length : tasks.filter(t => t.status === st).length})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Job / Step / Task ID 검색..."
            className="w-full sm:w-64 bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── Task Table ── */}
      <div className={`${theme.card} rounded-3xl border ${theme.border} overflow-hidden shadow-xl`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Task ID</th>
                <th className="p-4">Job Name</th>
                <th className="p-4">Step Name</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500 text-xs">
                    태스크 큐가 비어있거나 조건에 맞는 작업이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredTasks.map(task => (
                  <tr key={task.task_id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono font-bold text-blue-400">#{task.task_id}</td>
                    <td className="p-4 font-bold text-slate-200">{task.job_name}</td>
                    <td className="p-4 font-mono text-cyan-300">{task.step_name}</td>
                    <td className="p-4">{getStatusBadge(task.status)}</td>
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {task.created_at ? new Date(task.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> 상세
                      </button>
                      {(task.status === 'FAILED' || task.status === 'RETRY') && (
                        <button
                          onClick={() => handleRetryTask(task.task_id)}
                          className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> KAIROS 재시도
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Task Detail Modal ── */}
      {selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] text-white border border-slate-700/60 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                Task #{selectedTask.task_id} Details
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 font-bold block mb-1">JOB NAME</span>
                <span className="text-white font-mono font-bold">{selectedTask.job_name}</span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-slate-400 font-bold block mb-1">STEP NAME</span>
                <span className="text-cyan-300 font-mono font-bold">{selectedTask.step_name}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold text-xs block mb-1">PAYLOAD</span>
              <pre className="p-3 bg-black/80 rounded-xl font-mono text-[11px] text-cyan-300 overflow-x-auto border border-white/10 max-h-40 whitespace-pre-wrap">
                {typeof selectedTask.payload === 'object'
                  ? JSON.stringify(selectedTask.payload, null, 2)
                  : String(selectedTask.payload || '{}')}
              </pre>
            </div>

            {selectedTask.result_path && (
              <div>
                <span className="text-green-400 font-bold text-xs block mb-1">RESULT OUTPUT</span>
                <pre className="p-3 bg-green-950/30 rounded-xl font-mono text-[11px] text-green-300 overflow-x-auto border border-green-500/20 max-h-40 whitespace-pre-wrap">
                  {typeof selectedTask.result_path === 'object'
                    ? JSON.stringify(selectedTask.result_path, null, 2)
                    : String(selectedTask.result_path)}
                </pre>
              </div>
            )}

            {selectedTask.error_log && (
              <div>
                <span className="text-red-400 font-bold text-xs block mb-1">ERROR LOG / KAIROS TRACEBACK</span>
                <pre className="p-3 bg-red-950/40 rounded-xl font-mono text-[11px] text-red-300 overflow-x-auto border border-red-500/20 max-h-48 whitespace-pre-wrap">
                  {selectedTask.error_log}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskQueueView;
