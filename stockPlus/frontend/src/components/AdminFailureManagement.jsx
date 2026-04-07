import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Activity, Cpu, HardDrive, Terminal, AlertTriangle, CheckCircle, Clock, RefreshCw, ChevronRight, Zap, Database, Globe, Brain, Send, X, AlertCircle, Power } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// [v36.108] XTerm 터미널 컴포넌트 정의 (v36.114 마스터 키 연동)
const RealTerminal = ({ passkey }) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // [v36.115] 패스키가 없으면 절대 연결하지 않음 (이중 방어)
        if (!terminalRef.current || !passkey || passkey.trim() === "") return;

        // 1. XTerm 초기화
        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            theme: {
                background: '#020617', // slate-950
                foreground: '#cbd5e1', // slate-300
                cursor: '#6366f1',     // indigo-500
            }
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        
        setTimeout(() => fitAddon.fit(), 100);
        xtermRef.current = term;

        // 2. WebSocket 연결 (보안 마스터 키 포함)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/terminal-ws?passkey=${passkey}`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            term.writeln('\x1b[1;34m>>> Welcome to StockPlus AI Station v2.0\x1b[0m');
            term.writeln('\x1b[1;32m>>> Secure Access Granted via Master Key\x1b[0m\r\n');
            
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                socket.send(JSON.stringify({ cols: dims.cols, rows: dims.rows }));
            }
        };

        socket.onmessage = (event) => {
            term.write(event.data);
        };

        socket.onclose = () => {
            term.writeln('\r\n\x1b[1;31m>>> Terminal Disconnected.\x1b[0m');
        };

        // 3. 브라우저 -> 서버 전송
        term.onData((data) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(data);
            }
        });

        // 4. 창 크기 조절 대응
        const handleResize = () => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ cols: dims.cols, rows: dims.rows }));
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            socket.close();
            term.dispose();
        };
    }, []);

    return <div ref={terminalRef} className="flex-1 w-full h-full overflow-hidden rounded-2xl border border-indigo-500/20 shadow-inner" />;
};

// Gauge Chart Component
const GaugeChart = ({ value, label, colorClass, icon: Icon, subValue }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(value, 100) / 100) * circumference;

    return (
        <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-3xl p-4 flex flex-col items-center justify-center gap-2 group hover:border-[var(--theme-border)] transition-colors duration-500 transition-all shadow-lg text-center">
            <div className="relative w-20 h-20 flex items-center justify-center mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6" className="text-slate-800" />
                    <circle cx="40" cy="40" r={radius} fill="transparent" stroke="currentColor" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={classNames("transition-all duration-1000", colorClass)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center transition-colors">
                    <Icon size={16} className={classNames("mb-0.5 transition-colors", colorClass)} />
                    <span className="text-xs font-black text-[var(--theme-text)] transition-colors">{Math.round(value)}%</span>
                </div>
            </div>
            <div className="transition-colors">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest transition-colors">{label}</p>
                {subValue && <p className="text-[8px] font-bold text-slate-500 mt-0.5 transition-colors">{subValue}</p>}
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
    const [terminalPasskey, setTerminalPasskey] = useState(""); // [v36.114] 마스터 키 상태
    const [isTerminalUnlocked, setIsTerminalUnlocked] = useState(false);

    const fetchMetrics = async () => {
        try {
            const res = await fetch('/api/admin/system/metrics', { headers: getAuthHeader() });
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
            const res = await fetch('/api/admin/system/analyze-log', {
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
            const res = await fetch('/api/admin/system/restart', { method: 'POST', headers: getAuthHeader() });
            if (res.ok) alert("재시작 명령이 전송되었습니다.");
        } catch (err) {
            alert("명령 전송 실패");
        }
    };

    const prob = metrics?.failureProbability || 0;
    const statusColor = prob > 70 ? 'text-rose-500' : (prob > 45 ? 'text-amber-500' : 'text-emerald-500');

    return (
        <div className="flex-1 bg-[var(--theme-bg)] transition-colors duration-500 p-4 lg:p-8 overflow-hidden h-[100dvh] lg:h-full flex flex-col gap-4 lg:gap-6 relative pb-40 lg:pb-5">
            {/* ... 헤더 생략 ... */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-10">
                    <div>
                        <h1 className="text-xl lg:text-2xl font-black text-[var(--theme-text)] tracking-tight uppercase italic flex items-center gap-3 transition-colors">
                            <ShieldAlert className="text-rose-500" size={28} /> AI 장애 지능 관제
                        </h1>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1 lg:ml-10 hidden lg:block transition-colors">NOC ACTIVE | {lastUpdated.toLocaleTimeString()}</p>
                    </div>

                    <div className="hidden lg:flex bg-[var(--theme-header)] transition-colors duration-500 p-1 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 mr-4 shadow-inner transition-colors">
                        <button 
                            onClick={() => setActiveTab('metrics')}
                            className={classNames("px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transition-colors", 
                                activeTab !== 'aidev' ? "bg-[var(--theme-point)] text-white shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 hover:text-[var(--theme-text)]")}
                        >
                            지능 관제
                        </button>
                        <button 
                            onClick={() => setActiveTab('aidev')}
                            className={classNames("px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transition-colors", 
                                activeTab === 'aidev' ? "bg-[var(--theme-point)] text-white shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 hover:text-[var(--theme-text)]")}
                        >
                            AI 개발 센터
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <button onClick={handleRestartSystem} className="flex-1 lg:flex-none px-4 py-2 bg-rose-600/10 border border-rose-500/30 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                        <Power size={14} /> Restart
                    </button>
                    <button onClick={fetchMetrics} className="p-2.5 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 shadow-md">
                        <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            <main className={classNames(
                "flex-1 min-h-0 relative overflow-hidden",
                activeTab !== 'aidev' ? "grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6" : "flex flex-col"
            )}>
                {/* ... 지능 관제 뷰 (기존 코드 유지) ... */}
                {activeTab !== 'aidev' && (
                    <>
                        <div className={classNames(
                            "lg:col-span-4 flex flex-col gap-4 overflow-y-auto no-scrollbar transition-all duration-300",
                            activeTab === 'logs' && 'hidden lg:flex'
                        )}>
                            <div className={classNames("rounded-[2rem] p-6 border flex flex-col items-center justify-center gap-4 shadow-2xl bg-[var(--theme-header)] transition-colors duration-500/40", prob > 70 ? "border-rose-500/30" : "border-[var(--theme-border)] transition-colors duration-500")}>
                                <div className="text-center">
                                    <h3 className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-1">장애 위험도 지수</h3>
                                    <div className={classNames("text-5xl font-black tracking-tighter", statusColor)}>{prob}%</div>
                                </div>
                                <div className={classNames("px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all transition-colors", prob > 70 ? "bg-rose-500 text-white border-rose-400" : "bg-[var(--theme-bg)] text-slate-500 border-[var(--theme-border)]")}>
                                    {metrics?.status} PHASE
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <GaugeChart value={metrics?.cpuLoad || 0} label="CPU LOAD" colorClass="text-indigo-500" icon={Cpu} />
                                <GaugeChart value={metrics?.memoryUsage || 0} label="MEM USAGE" colorClass="text-cyan-500" icon={HardDrive} />
                                <GaugeChart value={metrics?.dbSessions || 0} label="DB SESSIONS" colorClass="text-amber-500" icon={Database} subValue="Active Conn" />
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-3xl p-4 flex flex-col items-center justify-center gap-2">
                                     <Globe size={24} className={metrics?.kisStatus?.connected ? "text-emerald-500" : "text-rose-500"} />
                                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">KIS ONLINE</p>
                                </div>
                            </div>
                            <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-3xl p-5 space-y-3 shadow-lg transition-colors">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors"><Brain size={12} className="text-indigo-600" /> AI System Verdict</h4>
                                <p className="text-[11px] text-[var(--theme-text)] font-black leading-relaxed bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 shadow-inner transition-colors">
                                     {prob > 70 ? "치명적 부하 감지. 즉시 긴급 재시작을 수행하십시오." : 
                                      (prob > 45 ? "주의 단계. 로그 에러 빈도가 증가하고 있습니다." : 
                                      "모든 지표가 청정 구역입니다. 엔진이 정상 가동 중입니다.")}
                                </p>
                            </div>
                        </div>

                        <div className={classNames(
                            "lg:col-span-8 flex flex-col bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-[2.5rem] overflow-hidden shadow-2xl relative transition-all duration-300",
                            activeTab === 'metrics' && 'hidden lg:flex'
                        )}>
                            <div className="px-6 py-5 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-bg)]/50 transition-colors duration-500 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-3 transition-colors">
                                    <Terminal size={18} className="text-indigo-600" />
                                    <h3 className="text-sm font-black text-[var(--theme-text)] uppercase italic tracking-tight transition-colors">System Blackbox Feed</h3>
                                </div>
                                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 transition-colors">
                                     <AlertCircle size={12} /> {window.innerWidth < 1024 ? "Log Feed" : "Click Log to Debug"}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 custom-scrollbar bg-black/20 select-text cursor-text">
                                {metrics?.recentErrors?.map((log, idx) => {
                                    const isCritical = log.includes('Critical') || log.includes('ERROR');
                                    return (
                                        <div key={idx} className={classNames("p-3 rounded-xl border transition-all group relative transition-colors", isCritical ? "bg-rose-500/10 border-rose-500/30 text-rose-600" : "bg-[var(--theme-bg)]/50 border-[var(--theme-border)] transition-colors duration-500 text-slate-500")}>
                                            <div className="flex items-start gap-3 select-text transition-colors">
                                                <span className={classNames("mt-0.5 shrink-0 transition-colors", isCritical ? "text-rose-600" : "text-amber-600")}><Zap size={14} /></span>
                                                <span className="break-all cursor-text font-bold transition-colors">{log}</span>
                                            </div>
                                            <button onClick={() => handleAnalyzeLog(log)} className="absolute right-3 bottom-2 opacity-0 lg:group-hover:opacity-100 transition-all flex items-center gap-1.5 bg-indigo-600 text-white px-2 py-1 rounded-md font-black text-[9px] uppercase shadow-lg active:scale-90 z-10"><Brain size={12} /> AI Debug</button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={classNames("absolute inset-y-0 right-0 w-full lg:w-[450px] bg-[var(--theme-header)] transition-colors duration-500 border-l border-[var(--theme-border)] transition-colors duration-500 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-30 transition-transform duration-500 ease-in-out transform flex flex-col transition-colors", isSidebarOpen ? "translate-x-0" : "translate-x-full")}>
                                <div className="p-5 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-bg)] transition-colors duration-500 flex justify-between items-center shrink-0 transition-colors">
                                     <div className="flex items-center gap-3 transition-colors"><Brain className="text-indigo-600" size={20} /><h3 className="text-sm font-black text-[var(--theme-text)] uppercase tracking-tighter italic transition-colors">AI Debugging Report</h3></div>
                                     <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-500 hover:text-[var(--theme-text)] transition-colors"><X size={20} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[var(--theme-header)] transition-colors duration-500 transition-colors">
                                     {selectedLog && (
                                         <div className="mb-6 transition-colors">
                                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 transition-colors">Target Incident Log</h4>
                                             <div className="bg-[var(--theme-bg)] transition-colors p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 font-mono text-[10px] text-rose-600 break-all font-black transition-colors shadow-inner">{selectedLog}</div>
                                         </div>
                                     )}
                                     <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors"><Activity size={12} /> Analysis & Resolution</h4>
                                     {isAnalyzing ? (
                                         <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                                             <RefreshCw size={32} className="animate-spin text-indigo-500 mb-2" />
                                             <p className="text-[10px] font-black text-slate-500 uppercase animate-pulse tracking-widest">Scanning Log...</p>
                                         </div>
                                     ) : (
                                         <div className="text-[12px] text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap font-black transition-colors">{aiAnalysis || "로그를 클릭하여 AI 분석을 시작하세요."}</div>
                                     )}
                                </div>
                                <div className="p-4 bg-[var(--theme-bg)] transition-colors duration-500 border-t border-[var(--theme-border)] transition-colors duration-500 shrink-0 transition-colors">
                                     <button onClick={() => setIsSidebarOpen(false)} className="w-full py-3 bg-[var(--theme-header)] text-[var(--theme-text)] font-black rounded-xl border border-[var(--theme-border)] text-xs uppercase tracking-widest hover:bg-[var(--theme-bg)] transition-all shadow-lg transition-colors">Close Report</button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 3. AI Dev Center Panel (v36.114 마스터 키 가드 적용) */}
                {activeTab === 'aidev' && (
                    <div className="flex-1 flex flex-col bg-[var(--theme-bg)] transition-colors duration-500 border border-[var(--theme-border)] rounded-[2.5rem] overflow-hidden shadow-2xl z-20 animate-in fade-in zoom-in duration-500 h-full transition-colors">
                        <div className="px-6 py-5 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex justify-between items-center shrink-0 transition-colors">
                            <div className="flex items-center gap-3 transition-colors">
                                <Brain size={20} className="text-indigo-600 animate-pulse" />
                                <h3 className="text-sm font-black text-[var(--theme-text)] uppercase italic tracking-tight transition-colors">Gemini AI Developer Station</h3>
                            </div>
                            <div className="flex items-center gap-2 transition-colors">
                                <span className={classNames("w-2 h-2 rounded-full transition-colors", isTerminalUnlocked ? "bg-emerald-500 animate-ping" : "bg-rose-500")}></span>
                                <span className={classNames("text-[10px] font-black uppercase tracking-widest transition-colors", isTerminalUnlocked ? "text-emerald-600" : "text-rose-600")}>
                                    {isTerminalUnlocked ? "Secure Session" : "Locked Station"}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col min-h-0 bg-black/40 p-4 overflow-hidden relative h-full">
                            {!isTerminalUnlocked ? (
                                // [v36.114] 마스터 키 입력 화면
                                <div className="flex-1 flex flex-col items-center justify-center gap-6 transition-colors">
                                    <div className="p-6 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-full shadow-2xl transition-colors">
                                        <ShieldAlert size={48} className="text-rose-600 animate-bounce" />
                                    </div>
                                    <div className="text-center transition-colors">
                                        <h4 className="text-[var(--theme-text)] font-black text-xl lg:text-2xl uppercase tracking-tighter transition-colors">Station Restricted</h4>
                                        <p className="text-slate-500 text-[11px] lg:text-sm font-black mt-2 transition-colors uppercase tracking-widest">Master Key Authentication Required</p>
                                    </div>
                                    <div className="w-full max-w-xs space-y-3 transition-colors">
                                        <input 
                                            type="password"
                                            value={terminalPasskey}
                                            onChange={(e) => setTerminalPasskey(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && setIsTerminalUnlocked(true)}
                                            placeholder="••••••••"
                                            autoFocus
                                            className="w-full bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl px-6 py-4 text-center text-[var(--theme-text)] font-mono font-black tracking-widest focus:border-[var(--theme-point)] outline-none transition-all shadow-inner"
                                        />
                                        <button 
                                            onClick={() => setIsTerminalUnlocked(true)}
                                            className="w-full py-4 bg-[var(--theme-point)] hover:bg-[var(--theme-point)]/80 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 transition-colors"
                                        >
                                            Unlock Station
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // 마스터 키 통과 시 진짜 터미널 렌더링
                                <RealTerminal passkey={terminalPasskey} />
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--theme-header)] transition-colors duration-500/90 backdrop-blur-xl border-t border-[var(--theme-border)] transition-colors duration-500 h-16 flex items-center justify-around px-6 z-40 pb-safe shadow-2xl">
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
