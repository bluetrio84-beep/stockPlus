import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Cpu, HardDrive, Terminal, AlertTriangle, CheckCircle, Clock, RefreshCw, ChevronRight, Zap, Database, Globe, Brain, Send, X, AlertCircle, Power } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

const AdminFailureManagement = () => {
    const [metrics, setMetrics] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    
    // AI 분석 상태
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/stockPlus/api/admin/system/metrics', { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error(">>> Failed to fetch system metrics:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyzeLog = async (logText) => {
        setSelectedLog(logText);
        setIsSidebarOpen(true);
        setIsAnalyzing(true);
        setAiAnalysis("");
        try {
            const res = await fetch('/stockPlus/api/admin/system/analyze-log', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ log: logText })
            });
            if (res.ok) {
                const data = await res.json();
                setAiAnalysis(data.analysis);
            }
        } catch (e) {
            setAiAnalysis("AI 분석 도중 오류가 발생했습니다.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRestartSystem = async () => {
        if (!window.confirm("정말로 시스템을 긴급 재시작하시겠습니까? 약 1분간 서비스가 중단됩니다.")) return;
        try {
            const res = await fetch('/stockPlus/api/admin/system/restart', { method: 'POST', headers: getAuthHeader() });
            if (res.ok) alert("재시작 명령이 전송되었습니다. 잠시 후 새로고침 하세요.");
        } catch (e) {
            alert("명령 전송 실패");
        }
    };

    useEffect(() => {
        fetchMetrics();
        const timer = setInterval(fetchMetrics, 10000);
        return () => clearInterval(timer);
    }, []);

    const GaugeChart = ({ value, label, colorClass, icon: Icon, subValue }) => {
        const radius = 35;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (Math.min(value, 100) / 100) * circumference;

        return (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center gap-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Icon size={32} /></div>
                <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                        <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={classNames("transition-all duration-1000", colorClass)} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-black text-white">{value}</span>
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                    {subValue && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{subValue}</p>}
                </div>
            </div>
        );
    };

    if (isLoading && !metrics) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 gap-4">
                <RefreshCw size={48} className="animate-spin text-indigo-500" />
                <p className="font-black uppercase tracking-[0.3em] text-xs">Synchronizing NOC Intelligence...</p>
            </div>
        );
    }

    const prob = metrics?.failureProbability || 0;
    const statusColor = prob > 70 ? 'text-rose-500' : (prob > 45 ? 'text-amber-500' : 'text-emerald-500');

    return (
        <div className="flex-1 bg-slate-950 p-4 lg:p-8 overflow-hidden h-[100dvh] lg:h-full flex flex-col gap-4 lg:gap-6 relative pb-28 lg:pb-5">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-3">
                        <ShieldAlert className="text-rose-500" size={28} /> AI 장애 지능 관제
                    </h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                        <Activity size={12} className="text-emerald-500" /> NOC ACTIVE | {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button onClick={handleRestartSystem} className="flex-1 lg:flex-none px-4 py-2.5 bg-rose-600/10 border border-rose-500/30 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all">
                        <Power size={14} /> Emergency Restart
                    </button>
                    <button onClick={fetchMetrics} className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95">
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 overflow-hidden">
                {/* Left Panel: Health Metrics */}
                <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto no-scrollbar">
                    {/* Risk Radar Card */}
                    <div className={classNames("rounded-[2rem] p-6 border flex flex-col items-center justify-center gap-4 shadow-2xl relative bg-slate-900/40 transition-colors", prob > 70 ? "border-rose-500/30" : "border-slate-800")}>
                        <div className="text-center">
                            <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">장애 위험도 지수</h3>
                            <div className={classNames("text-5xl font-black tracking-tighter", statusColor)}>{prob}%</div>
                        </div>
                        <div className={classNames("px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", prob > 70 ? "bg-rose-500 text-white border-rose-400" : "bg-slate-800 text-slate-400 border-slate-700")}>
                            {metrics?.status} PHASE
                        </div>
                    </div>

                    {/* Gauges Grid - Expanded */}
                    <div className="grid grid-cols-2 gap-4">
                        <GaugeChart value={metrics?.cpuLoad || 0} label="CPU LOAD" colorClass="text-indigo-500" icon={Cpu} />
                        <GaugeChart value={metrics?.memoryUsage || 0} label="MEM USAGE" colorClass="text-cyan-500" icon={HardDrive} />
                        <GaugeChart value={metrics?.dbSessions || 0} label="DB SESSIONS" colorClass="text-amber-500" icon={Database} subValue="Active Conn" />
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center gap-2 group">
                             <Globe size={24} className={metrics?.kisStatus?.connected ? "text-emerald-500" : "text-rose-500"} />
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">KIS API</p>
                             <span className={classNames("text-[10px] font-black uppercase", metrics?.kisStatus?.connected ? "text-emerald-500" : "text-rose-500")}>
                                 {metrics?.kisStatus?.connected ? "Online" : "Offline"}
                             </span>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                             <Brain size={12} className="text-indigo-400" /> AI System Verdict
                        </h4>
                        <p className="text-[11px] text-slate-300 font-bold leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                             {prob > 70 ? "치명적 부하 감지. 메모리 스왑이 임계치를 넘었습니다. 즉시 긴급 재시작을 수행하십시오." : 
                              (prob > 45 ? "주의 단계. KIS API 응답 속도가 지연되거나 로그 에러 빈도가 증가하고 있습니다." : 
                              "모든 지표가 청정 구역입니다. AI 엔진이 정상적인 예측 성능을 유지하고 있습니다.")}
                        </p>
                    </div>
                </div>

                {/* Right Panel: Blackbox Log & AI Analysis */}
                <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Terminal size={18} className="text-indigo-400" />
                            <h3 className="text-sm font-black text-white uppercase italic tracking-tight">System Blackbox Feed</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                             <AlertCircle size={12} /> Click Log to Debug with AI
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 custom-scrollbar bg-black/20">
                        {metrics?.recentErrors?.map((log, idx) => {
                            const isCritical = log.includes('Critical') || log.includes('ERROR');
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => handleAnalyzeLog(log)}
                                    className={classNames("p-3 rounded-xl border cursor-pointer transition-all hover:scale-[0.99] active:scale-95 group relative", 
                                        isCritical ? "bg-rose-500/5 border-rose-500/20 text-rose-200" : "bg-slate-800/30 border-slate-800 text-slate-400")}
                                >
                                    <div className="flex items-start gap-3">
                                        <span className={classNames("mt-0.5 shrink-0", isCritical ? "text-rose-500" : "text-amber-500")}>
                                            <Zap size={14} />
                                        </span>
                                        <span className="break-all">{log}</span>
                                    </div>
                                    <div className="absolute right-3 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-indigo-400 font-black text-[9px] uppercase">
                                         <Brain size={12} /> AI Debug
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* AI Analysis Sidebar */}
                    <div className={classNames("absolute inset-y-0 right-0 w-full lg:w-[450px] bg-slate-900 border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-30 transition-transform duration-500 ease-in-out transform flex flex-col", 
                        isSidebarOpen ? "translate-x-0" : "translate-x-full")}>
                        <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <Brain className="text-indigo-400" size={20} />
                                 <h3 className="text-sm font-black text-white uppercase tracking-tighter italic">AI Debugging Report</h3>
                             </div>
                             <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900">
                             {selectedLog && (
                                 <div className="mb-6">
                                     <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Incident Log</h4>
                                     <div className="bg-black/40 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-rose-300 break-all">{selectedLog}</div>
                                 </div>
                             )}
                             <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                 <Activity size={12} /> Analysis & Resolution
                             </h4>
                             {isAnalyzing ? (
                                 <div className="py-20 flex flex-col items-center justify-center gap-4">
                                     <RefreshCw size={32} className="animate-spin text-indigo-500" />
                                     <p className="text-xs font-black text-slate-500 uppercase animate-pulse">Gemini Brain Scanning...</p>
                                 </div>
                             ) : (
                                 <div className="text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                                     {aiAnalysis || "로그를 클릭하여 AI 분석을 시작하세요."}
                                 </div>
                             )}
                        </div>
                        <div className="p-4 bg-slate-950 border-t border-slate-800">
                             <button onClick={() => setIsSidebarOpen(false)} className="w-full py-3 bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-700 transition-all">Close Report</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminFailureManagement;
