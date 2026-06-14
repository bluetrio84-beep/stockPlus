import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Activity, CheckCircle2, XCircle, AlertCircle, RefreshCcw, Info } from 'lucide-react';

const ConsoleView = ({ theme }) => {
  const [logs, setLogs] = useState([{ agent: 'SYSTEM', message: 'Harness Kernel v2.1.0 Ready.', level: 'INFO', time: new Date().toLocaleTimeString() }]);
  const [input, setInput] = useState('');
  const [taskQueue, setTaskQueue] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);

  // 실시간 로그 스트리밍
  useEffect(() => {
    const eventSource = new EventSource('/api/stream/logs');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLogs(prev => [...prev, { ...data, time: new Date().toLocaleTimeString() }].slice(-50));
    };
    return () => eventSource.close();
  }, []);

  // 태스크 큐 폴링
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await axios.get('/api/tasks/queue');
        setTaskQueue(res.data);
      } catch (err) {
        console.error("Task queue fetch failed");
      }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const getLogColor = (level) => {
    switch(level) {
      case 'SUCCESS': return 'text-emerald-400';
      case 'ERROR': return 'text-red-400';
      case 'PROCESS': return 'text-blue-400';
      case 'WARNING': return 'text-yellow-400';
      default: return theme.title;
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'PENDING': return <Activity className="w-4 h-4 text-slate-500" />;
      case 'RUNNING': return <RefreshCcw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'SUCCESS': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'FAILED': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'RETRY': return <RefreshCcw className="w-4 h-4 text-amber-500 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'PENDING': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      case 'RUNNING': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'SUCCESS': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'FAILED': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'RETRY': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className={`text-3xl font-bold mb-2 ${theme.title}`}>Autonomous Console</h2><p className={theme.desc}>에이전트의 사고 과정과 실시간 작업 큐를 통합 관리합니다.</p></div>
        <div className={`bg-black/40 border ${theme.border} rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl`}>
          <div className="flex flex-col"><span className={`text-[10px] font-black ${theme.muted} uppercase tracking-tighter`}>Active Tasks</span><span className="text-xl font-black text-blue-400 font-mono">{taskQueue.filter(t => t.status === 'RUNNING' || t.status === 'RETRY').length}</span></div>
          <div className={`w-px h-8 ${theme.border}`}></div>
          <div className="flex flex-col text-right"><span className={`text-[10px] font-black ${theme.muted} uppercase tracking-tighter`}>Queue Status</span><span className="text-xs font-bold text-emerald-500">OPTIMIZED</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-[750px]">
        {/* Left: Terminal Log (2/3) */}
        <div className={`xl:col-span-2 ${theme.card} border ${theme.border} rounded-[2.5rem] p-8 font-mono text-xs shadow-2xl flex flex-col relative group`}>
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2"><div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/50"></div><div className="w-3 h-3 rounded-full bg-amber-500/50"></div><div className="w-3 h-3 rounded-full bg-emerald-500/50"></div></div><span className={`ml-4 text-[10px] font-bold ${theme.muted} uppercase tracking-widest`}>Harness Thought Stream</span></div>
            <div className="flex items-center gap-4"><span className="text-[10px] text-emerald-500/70 font-bold animate-pulse">● LIVE</span></div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 mb-6 scrollbar-hide">
            {logs.map((log, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300"><span className={`${theme.muted} mr-3 text-[10px]`}>[{log.time}]</span><span className={`font-bold mr-3 ${log.agent === 'SYSTEM' ? 'text-purple-400' : 'text-blue-500'}`}>[{log.agent}]</span><span className={getLogColor(log.level)}>{log.message}</span></div>
            ))}
          </div>
          <div className={`flex items-center gap-4 bg-black/20 p-4 rounded-2xl border ${theme.border} group-focus-within:border-blue-500/50 transition-all`}><span className="text-blue-500 font-black tracking-widest px-2">ROOT@HARNESS:~$</span><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setLogs(prev => [...prev, { agent: 'USER', message: input, level: 'INFO', time: new Date().toLocaleTimeString() }]); setInput(''); } }} placeholder="명령어를 입력하세요..." className={`flex-1 bg-transparent border-none focus:outline-none ${theme.title} font-medium`} /><Terminal className={`${theme.muted} w-5 h-5`} /></div>
        </div>

        {/* Right: Task Queue (1/3) */}
        <div className={`${theme.card} border ${theme.border} rounded-[2.5rem] p-8 shadow-2xl flex flex-col overflow-hidden`}>
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h3 className={`text-lg font-black ${theme.title}`}>Task Queue</h3>
            <span className={`text-[10px] font-bold ${theme.muted}`}>RECENT 50</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
            {taskQueue.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30"><Activity className="w-12 h-12 mb-4" /><p className="text-sm">대기 중인 작업이 없습니다.</p></div>
            ) : (
              taskQueue.map((task) => (
                <div key={task.task_id} onClick={() => setSelectedTask(task)} className={`p-4 rounded-2xl border ${selectedTask?.task_id === task.task_id ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 bg-white/[0.02]'} hover:border-blue-500/30 transition-all cursor-pointer group`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black ${theme.muted}`}>#{task.task_id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border flex items-center gap-1.5 ${getStatusClass(task.status)}`}>{getStatusIcon(task.status)}{task.status}</span>
                  </div>
                  <h4 className={`text-sm font-bold ${theme.title} truncate mb-1`}>{task.job_name}</h4>
                  <p className={`text-[11px] ${theme.muted} truncate`}>{task.step_name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedTask(null)}></div>
          <div className={`${theme.card} relative w-full max-w-2xl border ${theme.border} rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden`}>
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-4"><div className={`p-3 rounded-xl ${getStatusClass(selectedTask.status)}`}>{getStatusIcon(selectedTask.status)}</div><div><h3 className={`text-xl font-black ${theme.title}`}>{selectedTask.job_name}</h3><p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">TASK DETAILS</p></div></div>
              <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-400"><XCircle className="w-6 h-6" /></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Step</p><p className="text-sm font-bold text-blue-400">{selectedTask.step_name}</p></div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p><p className="text-sm font-bold text-white">{selectedTask.status}</p></div>
              </div>
              
              {selectedTask.payload && (
                <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payload</p><pre className="bg-black/40 p-4 rounded-xl border border-white/5 text-[11px] text-slate-300 overflow-x-auto">{JSON.stringify(selectedTask.payload, null, 2)}</pre></div>
              )}

              {selectedTask.error_log && (
                <div>
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 px-1">Error / AI Analysis</p>
                  <pre className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-[11px] text-red-300 whitespace-pre-wrap">{selectedTask.error_log}</pre>
                </div>
              )}

              {selectedTask.result_path && (
                <div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 px-1">Result</p><p className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 text-[11px] text-emerald-300 truncate">{selectedTask.result_path}</p></div>
              )}
            </div>
            <div className="p-8 border-t border-white/5 bg-black/20">
              <button onClick={() => setSelectedTask(null)} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsoleView;
