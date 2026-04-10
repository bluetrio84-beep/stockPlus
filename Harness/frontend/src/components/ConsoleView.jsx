import React, { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';

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
      default: return theme.title;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className={`text-3xl font-bold mb-2 ${theme.title}`}>Agent Console</h2><p className={theme.desc}>에이전트 군단의 사고 과정을 실시간 모니터링합니다.</p></div>
        <div className={`bg-black/40 border ${theme.border} rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl`}>
          <div className="flex flex-col"><span className={`text-[10px] font-black ${theme.muted} uppercase tracking-tighter`}>Session Cost</span><span className="text-xl font-black text-emerald-400 font-mono">$0.0425</span></div>
          <div className={`w-px h-8 ${theme.border}`}></div>
          <div className="flex flex-col text-right"><span className={`text-[10px] font-black ${theme.muted} uppercase tracking-tighter`}>Usage Status</span><span className="text-xs font-bold text-blue-500">LIVE STREAMING</span></div>
        </div>
      </div>
      <div className={`${theme.card} border ${theme.border} rounded-[2.5rem] p-10 font-mono text-sm shadow-2xl h-[650px] flex flex-col relative group`}>
        <div className="flex-1 overflow-y-auto space-y-2 mb-6 scrollbar-hide">
          {logs.map((log, i) => (
            <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300"><span className={`${theme.muted} mr-3`}>[{log.time}]</span><span className={`font-bold mr-3 ${log.agent === 'SYSTEM' ? 'text-purple-400' : 'text-blue-500'}`}>[{log.agent}]</span><span className={getLogColor(log.level)}>{log.message}</span></div>
          ))}
        </div>
        <div className={`flex items-center gap-4 bg-black/20 p-4 rounded-2xl border ${theme.border} group-focus-within:border-blue-500/50 transition-all`}><span className="text-blue-500 font-black tracking-widest px-2">ROOT@HARNESS:~$</span><input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setLogs(prev => [...prev, { agent: 'USER', message: input, level: 'INFO', time: new Date().toLocaleTimeString() }]); setInput(''); } }} placeholder="명령어를 입력하세요..." className={`flex-1 bg-transparent border-none focus:outline-none ${theme.title} font-medium`} /><Terminal className={`${theme.muted} w-5 h-5`} /></div>
      </div>
    </div>
  );
};

export default ConsoleView;
