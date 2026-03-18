import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Cpu, HardDrive, Terminal, AlertTriangle, CheckCircle, Clock, RefreshCw, ChevronRight, Zap, Database, Globe, Brain, Send, X, AlertCircle, Power } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

// Gauge Chart Component
const GaugeChart = ({ value, label, colorClass, icon: Icon, subValue }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(value, 100) / 100) * circumference;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center gap-2 group hover:border-slate-700 transition-all shadow-lg text-center">
            <div className="relative w-20 h-20 flex items-center justify-center mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6" className="text-slate-800" />
                    <circle cx="40" cy="40" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={classNames("transition-all duration-1000", colorClass)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Icon size={16} className={classNames("mb-0.5", colorClass)} />
                    <span className="text-xs font-black text-white">{Math.round(value)}%</span>
                </div>
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                {subValue && <p className="text-[8px] font-bold text-slate-600 mt-0.5">{subValue}</p>}
            </div>
        </div>
    );
};

const AdminFailureManagement = () => {
    const [metrics, setMetrics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    
    // AI 분석 상태
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    // [v36.82] 통합 탭 상태 (지표, 로그, AI 개발 센터)
    const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'logs', 'aidev'

    // [v36.83] 터미널 전용 상태
    const [terminalInput, setTerminalInput] = useState("");
    const [terminalLogs, setTerminalLogs] = useState([
        { type: 'sys', content: '>>> Welcome to StockPlus AI Console v1.0' },
        { type: 'sys', content: '// 시스템 실시간 제어 및 AI 공동 개발 보안 콘솔입니다.' }
    ]);
    const [isExecuting, setIsExecuting] = useState(false);

    const handleTerminalCommand = async (e) => {
        if (e.key !== 'Enter' || !terminalInput.trim() || isExecuting) return;

        const cmd = terminalInput.trim();
        setTerminalLogs(prev => [...prev, { type: 'cmd', content: cmd }]);
        setTerminalInput("");
        setIsExecuting(true);

        try {
            const res = await fetch('/stockPlus/api/admin/system/terminal/execute', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            if (res.ok) {
                const data = await res.json();
                setTerminalLogs(prev => [...prev, { type: 'res', content: data.output }]);
            } else {
                setTerminalLogs(prev => [...prev, { type: 'err', content: '>>> API Connection Failed (401/403/500)' }]);
            }
        } catch (err) {
            setTerminalLogs(prev => [...prev, { type: 'err', content: `>>> Error: ${err.message}` }]);
        } finally {
            setIsExecuting(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/stockPlus/api/admin/system/metrics', { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Fetch metrics error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAnalyzeLog = async (logContent) => {
        setSelectedLog(logContent);
        setIsSidebarOpen(true);
        setIsAnalyzing(true);
        setAiAnalysis("");

        try {
            const res = await fetch('/stockPlus/api/admin/system/analyze-log', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ log: logContent })
            });
            if (res.ok) {
                const data = await res.json();
                setAiAnalysis(data.analysis);
            }
        } catch (err) {
            setAiAnalysis("AI 분석 중 오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRestartSystem = async () => {
        if (!window.confirm("정말로 시스템을 긴급 재시작하시겠습니까?")) return;
        try {
            const res = await fetch('/stockPlus/api/admin/system/restart', { method: 'POST', headers: getAuthHeader() });
            if (res.ok) alert("재시작 명령이 전송되었습니다.");
        } catch (err) {
            alert("명령 전송 실패");
        }
    };

    const prob = metrics?.failureProbability || 0;
    const statusColor = prob > 70 ? 'text-rose-500' : (prob > 45 ? 'text-amber-500' : 'text-emerald-500');

    return (
        <div className="flex-1 bg-slate-950 p-4 lg:p-8 overflow-hidden h-[100dvh] lg:h-full flex flex-col gap-4 lg:gap-6 relative pb-40 lg:pb-5">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-10">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                            <ShieldAlert className="text-rose-500" size={28} /> AI 장애 지능 관제
                        </h1>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-1 lg:ml-10 hidden lg:block">NOC ACTIVE | {lastUpdated.toLocaleTimeString()}</p>
                    </div>

                    {/* [v36.82] PC 전용 상단 탭 내비게이션 */}
                    <div className="hidden lg:flex bg-slate-900 p-1 rounded-xl border border-slate-800 mr-4 shadow-inner">
                        <button 
                            onClick={() => setActiveTab('metrics')}
                            className={classNames("px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                                activeTab !== 'aidev' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}
                        >
                            지능 관제
                        </button>
                        <button 
                            onClick={() => setActiveTab('aidev')}
                            className={classNames("px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", 
                                activeTab === 'aidev' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}
                        >
                            AI 개발 센터
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button onClick={handleRestartSystem} className="flex-1 lg:flex-none px-4 py-2 bg-rose-600/10 border border-rose-500/30 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                        <Power size={14} /> Restart
                    </button>
                    <button onClick={fetchMetrics} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 shadow-md">
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            <main className={classNames(
                "flex-1 min-h-0 relative overflow-hidden",
                activeTab !== 'aidev' ? "grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6" : "flex flex-col"
            )}>
                {/* 1 & 2. 지능 관제 뷰 (지표 + 로그 병합 모드) */}
                {activeTab !== 'aidev' && (
                    <>
                        <div className={classNames(
                            "lg:col-span-4 flex flex-col gap-4 overflow-y-auto no-scrollbar transition-all duration-300",
                            activeTab === 'logs' && 'hidden lg:flex'
                        )}>
                            <div className={classNames("rounded-[2rem] p-6 border flex flex-col items-center justify-center gap-4 shadow-2xl bg-slate-900/40", prob > 70 ? "border-rose-500/30" : "border-slate-800")}>
                                <div className="text-center">
                                    <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">장애 위험도 지수</h3>
                                    <div className={classNames("text-5xl font-black tracking-tighter", statusColor)}>{prob}%</div>
                                </div>
                                <div className={classNames("px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", prob > 70 ? "bg-rose-500 text-white border-rose-400" : "bg-slate-800 text-slate-400 border-slate-700")}>
                                    {metrics?.status} PHASE
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <GaugeChart value={metrics?.cpuLoad || 0} label="CPU LOAD" colorClass="text-indigo-500" icon={Cpu} />
                                <GaugeChart value={metrics?.memoryUsage || 0} label="MEM USAGE" colorClass="text-cyan-500" icon={HardDrive} />
                                <GaugeChart value={metrics?.dbSessions || 0} label="DB SESSIONS" colorClass="text-amber-500" icon={Database} subValue="Active Conn" />
                                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center gap-2">
                                     <Globe size={24} className={metrics?.kisStatus?.connected ? "text-emerald-500" : "text-rose-500"} />
                                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">KIS ONLINE</p>
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-lg">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2"><Brain size={12} className="text-indigo-400" /> AI System Verdict</h4>
                                <p className="text-[11px] text-slate-300 font-bold leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800 shadow-inner">
                                     {prob > 70 ? "치명적 부하 감지. 즉시 긴급 재시작을 수행하십시오." : 
                                      (prob > 45 ? "주의 단계. 로그 에러 빈도가 증가하고 있습니다." : 
                                      "모든 지표가 청정 구역입니다. 엔진이 정상 가동 중입니다.")}
                                </p>
                            </div>
                        </div>

                        <div className={classNames(
                            "lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative transition-all duration-300",
                            activeTab === 'metrics' && 'hidden lg:flex'
                        )}>
                            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3">
                                    <Terminal size={18} className="text-indigo-400" />
                                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight">System Blackbox Feed</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                                     <AlertCircle size={12} /> {window.innerWidth < 1024 ? "Log Feed" : "Click Log to Debug"}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 custom-scrollbar bg-black/20 select-text cursor-text">
                                {metrics?.recentErrors?.map((log, idx) => {
                                    const isCritical = log.includes('Critical') || log.includes('ERROR');
                                    return (
                                        <div key={idx} className={classNames("p-3 rounded-xl border transition-all group relative", isCritical ? "bg-rose-500/5 border-rose-500/20 text-rose-200" : "bg-slate-800/30 border-slate-800 text-slate-400")}>
                                            <div className="flex items-start gap-3 select-text">
                                                <span className={classNames("mt-0.5 shrink-0", isCritical ? "text-rose-500" : "text-amber-500")}><Zap size={14} /></span>
                                                <span className="break-all cursor-text">{log}</span>
                                            </div>
                                            <button onClick={() => handleAnalyzeLog(log)} className="absolute right-3 bottom-2 opacity-0 lg:group-hover:opacity-100 transition-all flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white px-2 py-1 rounded-md font-black text-[9px] uppercase shadow-lg active:scale-90 z-10"><Brain size={12} /> AI Debug</button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={classNames("absolute inset-y-0 right-0 w-full lg:w-[450px] bg-slate-900 border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-30 transition-transform duration-500 ease-in-out transform flex flex-col", isSidebarOpen ? "translate-x-0" : "translate-x-full")}>
                                <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                                     <div className="flex items-center gap-3"><Brain className="text-indigo-400" size={20} /><h3 className="text-sm font-black text-white uppercase tracking-tighter italic">AI Debugging Report</h3></div>
                                     <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900">
                                     {selectedLog && (
                                         <div className="mb-6">
                                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Incident Log</h4>
                                             <div className="bg-black/40 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-rose-300 break-all">{selectedLog}</div>
                                         </div>
                                     )}
                                     <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Activity size={12} /> Analysis & Resolution</h4>
                                     {isAnalyzing ? (
                                         <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                                             <RefreshCw size={32} className="animate-spin text-indigo-500 mb-2" />
                                             <p className="text-[10px] font-black text-slate-500 uppercase animate-pulse tracking-widest">Scanning Log...</p>
                                         </div>
                                     ) : (
                                         <div className="text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">{aiAnalysis || "로그를 클릭하여 AI 분석을 시작하세요."}</div>
                                     )}
                                </div>
                                <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                                     <button onClick={() => setIsSidebarOpen(false)} className="w-full py-3 bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg">Close Report</button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 3. AI Dev Center Panel */}
                {activeTab === 'aidev' && (
                    <div className="flex-1 flex flex-col bg-slate-950 border border-indigo-500/30 rounded-[2.5rem] overflow-hidden shadow-2xl z-20 animate-in fade-in zoom-in duration-500 h-full">
                        <div className="px-6 py-5 border-b border-indigo-500/20 bg-indigo-500/5 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <Brain size={20} className="text-indigo-400 animate-pulse" />
                                <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Gemini AI Developer Center</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Console</span>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-col min-h-0 bg-black/40 p-4 font-mono text-sm overflow-hidden relative">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-950/20 rounded-2xl border border-slate-800/30 shadow-inner select-text cursor-text">
                                {terminalLogs.map((log, i) => (
                                    <div key={i} className="mb-3">
                                        {log.type === 'sys' && <p className="text-indigo-400 font-black mb-1">{log.content}</p>}
                                        {log.type === 'cmd' && (
                                            <div className="flex gap-2">
                                                <span className="text-indigo-500 font-black">bluetrio@stockplus:~$</span>
                                                <span className="text-white font-bold">{log.content}</span>
                                            </div>
                                        )}
                                        {log.type === 'res' && <pre className="text-slate-400 text-xs pl-4 whitespace-pre-wrap mt-1 font-mono leading-tight">{log.content}</pre>}
                                        {log.type === 'err' && <p className="text-rose-500 text-xs pl-4 italic mt-1">{log.content}</p>}
                                    </div>
                                ))}
                                {isExecuting && <div className="flex gap-2 animate-pulse"><span className="text-indigo-500 font-black">...</span><span className="text-slate-500 text-xs">Executing on server...</span></div>}
                                <div className="flex gap-2 mt-2">
                                    <span className="text-indigo-500 font-black">bluetrio@stockplus:~$</span>
                                    <span className="w-2 h-5 bg-indigo-500 animate-pulse"></span>
                                </div>
                            </div>
                            <div className="h-14 border-t border-slate-800 flex items-center gap-3 px-4 bg-slate-900/50 shrink-0 mt-4 rounded-b-2xl">
                                <span className="text-indigo-500 font-black text-xs shrink-0">bluetrio@admin:~$</span>
                                <input 
                                    type="text" 
                                    value={terminalInput}
                                    onChange={(e) => setTerminalInput(e.target.value)}
                                    onKeyDown={handleTerminalCommand}
                                    placeholder={isExecuting ? "Executing..." : "Enter shell command..."} 
                                    disabled={isExecuting}
                                    className="flex-1 bg-transparent border-none outline-none text-white font-mono text-sm placeholder:text-slate-700" 
                                />
                                <Zap size={18} className={classNames("transition-colors cursor-pointer", isExecuting ? "text-amber-500 animate-bounce" : "text-slate-600 hover:text-amber-400")} />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 h-16 flex items-center justify-around px-6 z-40 pb-safe shadow-2xl">
                <button onClick={() => setActiveTab('metrics')} className={classNames("flex flex-col items-center gap-1 transition-all", activeTab === 'metrics' ? "text-indigo-400" : "text-slate-500")}>
                    <Activity size={18} /><span className="text-[9px] font-black uppercase tracking-tighter">지표</span>
                </button>
                <button onClick={() => setActiveTab('logs')} className={classNames("flex flex-col items-center gap-1 transition-all", activeTab === 'logs' ? "text-rose-400" : "text-slate-500")}>
                    <Terminal size={18} /><span className="text-[9px] font-black uppercase tracking-tighter">로그</span>
                </button>
                <button onClick={() => setActiveTab('aidev')} className={classNames("flex flex-col items-center gap-1 transition-all", activeTab === 'aidev' ? "text-white" : "text-slate-500")}>
                    <div className={classNames("p-1.5 rounded-full transition-all shadow-inner", activeTab === 'aidev' ? "bg-indigo-600 shadow-lg" : "bg-slate-800")}>
                        <Brain size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">AI 개발</span>
                </button>
            </div>
        </div>
    );
};

export default AdminFailureManagement;
