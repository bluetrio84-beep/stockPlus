import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Activity, Cpu, HardDrive, Terminal, AlertTriangle, CheckCircle, Clock, RefreshCw, ChevronRight, Zap, Database, Globe, Brain, Send, X, AlertCircle, Power, Maximize2, Minimize2, Clipboard, Square, RotateCcw, Lock, Unlock, Sparkles, ShieldCheck, Play } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

// [v38.00] Antigravity AI Station 터미널 컴포넌트 (JWT 토큰 & 마스터키 하이브리드 인증 + 퀵 액션)
// [v38.20] Antigravity AI Station 터미널 컴포넌트 (디바운스 리사이즈 + 중복 패킷 원천 차단 + TUI 완벽 동기화)
const RealTerminal = ({ passkey, onLock }) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const socketRef = useRef(null);
    const fitAddonRef = useRef(null);
    const lastSizeRef = useRef({ cols: 0, rows: 0 });

    const [fontSize, setFontSize] = useState(13);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [connStatus, setConnStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'

    // 명령어 전송 헬퍼
    const sendCommand = (cmd) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(cmd);
            xtermRef.current?.focus();
        }
    };

    // 크기 변경 패킷 전송 (동일 크기 중복 전송 100% 차단)
    const sendResize = (cols, rows) => {
        if (!cols || !rows || cols < 10 || rows < 5) return;
        if (lastSizeRef.current.cols === cols && lastSizeRef.current.rows === rows) {
            return; // 이전과 동일한 크기이면 전송하지 않음
        }
        lastSizeRef.current = { cols, rows };
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
    };

    // 폰트 크기 변경
    const changeFontSize = (delta) => {
        const newSize = Math.max(10, Math.min(22, fontSize + delta));
        setFontSize(newSize);
        if (xtermRef.current && fitAddonRef.current) {
            xtermRef.current.options.fontSize = newSize;
            setTimeout(() => {
                try {
                    fitAddonRef.current?.fit();
                } catch (e) {}
            }, 100);
        }
    };

    // 클립보드 붙여넣기
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                sendCommand(text);
            }
        } catch (e) {
            const promptText = prompt("터미널에 붙여넣을 텍스트를 입력하세요:");
            if (promptText) sendCommand(promptText);
        }
    };

    useEffect(() => {
        if (!terminalRef.current) return;

        // 1. XTerm 인스턴스 초기화
        const term = new XTerm({
            cursorBlink: true,
            cursorStyle: 'block',
            fontSize: fontSize,
            fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
            lineHeight: 1.15,
            letterSpacing: 0,
            convertEol: true,
            scrollback: 10000,
            windowsMode: false,
            theme: {
                background: '#030712', // gray-950
                foreground: '#e2e8f0', // slate-200
                cursor: '#38bdf8',     // cyan-400
                cursorAccent: '#030712',
                selectionBackground: 'rgba(99, 102, 241, 0.4)'
            }
        });
        const fitAddon = new FitAddon();
        fitAddonRef.current = fitAddon;
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        xtermRef.current = term;

        // xterm 내부에서 실제 크기가 달라졌을 때만 소켓 전송
        term.onResize(({ cols, rows }) => {
            sendResize(cols, rows);
        });

        // 초기 크기 추정
        const initialDims = fitAddon.proposeDimensions();
        const initialCols = initialDims?.cols || 100;
        const initialRows = initialDims?.rows || 30;
        lastSizeRef.current = { cols: initialCols, rows: initialRows };

        // 2. WebSocket 연결
        const token = localStorage.getItem('token') || '';
        const params = new URLSearchParams();
        if (token && token.length > 10) {
            params.set('token', token);
        }
        if (passkey && passkey.trim()) {
            params.set('passkey', passkey.trim());
        } else if (!params.has('token')) {
            params.set('passkey', 'ADMIN_DIRECT');
        }
        params.set('cols', initialCols);
        params.set('rows', initialRows);

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/terminal-ws?${params.toString()}`;
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            setConnStatus('connected');
            setTimeout(() => {
                try {
                    fitAddon.fit();
                } catch (e) {}
            }, 100);
        };

        socket.onmessage = (event) => {
            term.write(event.data);
        };

        socket.onclose = () => {
            setConnStatus('disconnected');
            term.writeln('\r\n\x1b[1;31m>>> [Antigravity Terminal] Connection Closed.\x1b[0m');
        };

        socket.onerror = () => {
            setConnStatus('disconnected');
        };

        // 3. 사용자 키보드 입력 -> PTY 전송
        term.onData((data) => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(data);
            }
        });

        // 4. 리사이즈 디바운스 (무한 루프 방지 핵심)
        let resizeTimer = null;
        const triggerDebouncedFit = () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                try {
                    fitAddon.fit();
                } catch (e) {}
            }, 150);
        };

        window.addEventListener('resize', triggerDebouncedFit);

        // ResizeObserver 디바운스 적용
        let resizeObserver = null;
        if (window.ResizeObserver && terminalRef.current) {
            resizeObserver = new ResizeObserver(() => {
                triggerDebouncedFit();
            });
            resizeObserver.observe(terminalRef.current);
        }

        // 터미널 클릭 시 포커스
        const termElement = terminalRef.current;
        const handleTerminalClick = () => term.focus();
        termElement?.addEventListener('click', handleTerminalClick);

        return () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            if (resizeObserver) resizeObserver.disconnect();
            window.removeEventListener('resize', triggerDebouncedFit);
            termElement?.removeEventListener('click', handleTerminalClick);
            socket.close();
            term.dispose();
        };
    }, []);

    // 퀵 액션 프리셋 목록
    const quickActions = [
        { label: '백엔드 로그', icon: Activity, cmd: 'b-logs\n', color: 'hover:border-cyan-500/50 hover:text-cyan-400' },
        { label: '수집기 로그', icon: Terminal, cmd: 'c-logs\n', color: 'hover:border-indigo-500/50 hover:text-indigo-400' },
        { label: '시스템 점검', icon: Cpu, cmd: 'sys-stat\n', color: 'hover:border-emerald-500/50 hover:text-emerald-400' },
        { label: 'Antigravity CLI', icon: Brain, cmd: 'agy\n', color: 'hover:border-purple-500/50 hover:text-purple-400' },
        { label: '수집기 재기동', icon: RefreshCw, cmd: 'docker restart stockplus-collector-1\n', color: 'hover:border-amber-500/50 hover:text-amber-400' },
        { label: '중지 (Ctrl+C)', icon: Square, cmd: '\x03', color: 'hover:border-rose-500/50 hover:text-rose-400' },
        { label: 'Clear', icon: RotateCcw, cmd: 'clear\n', color: 'hover:border-slate-500/50 hover:text-slate-300' },
    ];

    return (
        <div className={classNames(
            "flex flex-col w-full h-full rounded-2xl border border-indigo-500/30 overflow-hidden bg-slate-950/90 shadow-2xl transition-all duration-300",
            isFullscreen && "fixed inset-0 z-50 rounded-none border-none p-3 bg-black"
        )}>
            {/* 1. 상단 터미널 툴바 & 퀵 액션 바 */}
            <div className="bg-slate-900/90 border-b border-indigo-500/20 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* 퀵 액션 버튼 그룹 */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline-flex items-center gap-1">
                        <Zap size={11} className="text-amber-400" /> Quick:
                    </span>
                    {quickActions.map((action, idx) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => sendCommand(action.cmd)}
                                className={classNames(
                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-800 bg-slate-950/80 text-slate-300 flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-sm",
                                    action.color
                                )}
                            >
                                <Icon size={11} />
                                <span>{action.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 우측 유틸리티 버튼 그룹 */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* 상태 인디케이터 */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 mr-1">
                        <span className={classNames("w-1.5 h-1.5 rounded-full", 
                            connStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 
                            connStatus === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-rose-500'
                        )} />
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                            {connStatus}
                        </span>
                    </div>

                    {/* 클립보드 붙여넣기 */}
                    <button
                        onClick={handlePaste}
                        title="클립보드 붙여넣기"
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-90"
                    >
                        <Clipboard size={13} />
                    </button>

                    {/* 폰트 축소/확대 */}
                    <button
                        onClick={() => changeFontSize(-1)}
                        title="폰트 축소"
                        className="px-2 py-1 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white text-[10px] font-mono font-bold transition-all active:scale-90"
                    >
                        A-
                    </button>
                    <button
                        onClick={() => changeFontSize(1)}
                        title="폰트 확대"
                        className="px-2 py-1 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white text-[10px] font-mono font-bold transition-all active:scale-90"
                    >
                        A+
                    </button>

                    {/* 전체화면 토글 */}
                    <button
                        onClick={() => {
                            setIsFullscreen(!isFullscreen);
                            setTimeout(() => {
                                try {
                                    fitAddonRef.current?.fit();
                                } catch (e) {}
                            }, 100);
                        }}
                        title={isFullscreen ? "창 모드로 복귀" : "전체화면"}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-all active:scale-90"
                    >
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>

                    {/* 잠금(나가기) */}
                    {onLock && (
                        <button
                            onClick={onLock}
                            title="터미널 잠금"
                            className="p-1.5 rounded-lg border border-rose-900/40 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition-all active:scale-90 ml-1"
                        >
                            <Lock size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. xterm 터미널 본체 렌더링 영역 */}
            <div ref={terminalRef} className="flex-1 w-full h-full overflow-hidden p-2" />
        </div>
    );
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
    
    // [v38.00] 통합 탭 상태 (지표, 로그, Antigravity AI 개발 센터)
    const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'logs', 'aidev'
    const [terminalPasskey, setTerminalPasskey] = useState(() => localStorage.getItem('stockplus_terminal_key') || '');
    const [isTerminalUnlocked, setIsTerminalUnlocked] = useState(false);
    const [rememberKey, setRememberKey] = useState(true);

    const handleUnlockWithKey = () => {
        if (rememberKey && terminalPasskey) {
            localStorage.setItem('stockplus_terminal_key', terminalPasskey);
        }
        setIsTerminalUnlocked(true);
    };

    const handleQuickUnlock = () => {
        setIsTerminalUnlocked(true);
    };

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
                            className={classNames("px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all transition-colors flex items-center gap-1.5", 
                                activeTab === 'aidev' ? "bg-[var(--theme-point)] text-white shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 hover:text-[var(--theme-text)]")}
                        >
                            <Terminal size={12} />
                            <span>AI 개발 센터</span>
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

                {/* 3. Antigravity AI Station Panel (v38.00 스마트 인증 + 퀵 액션 가드) */}
                {activeTab === 'aidev' && (
                    <div className="flex-1 flex flex-col bg-[var(--theme-bg)] transition-colors duration-500 border border-[var(--theme-border)] rounded-[2.5rem] overflow-hidden shadow-2xl z-20 animate-in fade-in zoom-in duration-500 h-full transition-colors">
                        {/* 패널 헤더 */}
                        <div className="px-6 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex justify-between items-center shrink-0 transition-colors">
                            <div className="flex items-center gap-3 transition-colors">
                                <div className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
                                    <Brain size={18} className="animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-[var(--theme-text)] uppercase italic tracking-tight flex items-center gap-2 transition-colors">
                                        Antigravity AI Station <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 not-italic font-mono">v3.0</span>
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:block">NOC Live Terminal & Operational Agent</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 transition-colors">
                                <span className={classNames("w-2 h-2 rounded-full transition-colors", isTerminalUnlocked ? "bg-emerald-400 animate-pulse" : "bg-amber-400")}></span>
                                <span className={classNames("text-[10px] font-black uppercase tracking-widest font-mono transition-colors", isTerminalUnlocked ? "text-emerald-400" : "text-amber-400")}>
                                    {isTerminalUnlocked ? "Authorized Admin Session" : "Protected Station"}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex-1 flex flex-col min-h-0 bg-black/60 p-3 sm:p-4 overflow-hidden relative h-full">
                            {!isTerminalUnlocked ? (
                                // [v38.00] 하이브리드 잠금 해제 화면 (원클릭 Admin 인증 + 수동 마스터키 지원)
                                <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full transition-colors">
                                    <div className="p-5 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl shadow-2xl transition-colors mb-6 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30 mb-3">
                                            <ShieldCheck size={32} className="text-white" />
                                        </div>
                                        <h4 className="text-[var(--theme-text)] font-black text-lg sm:text-xl uppercase tracking-tight transition-colors">
                                            Station Access Control
                                        </h4>
                                        <p className="text-slate-500 text-[11px] font-bold mt-1 uppercase tracking-wider">
                                            Antigravity AI CLI & System Terminal Guard
                                        </p>
                                    </div>

                                    {/* 1. 관리자 원클릭 즉시 접속 버튼 */}
                                    <div className="w-full space-y-4">
                                        <button 
                                            onClick={handleQuickUnlock}
                                            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2.5 border border-indigo-400/30 group"
                                        >
                                            <Sparkles size={16} className="text-amber-300 group-hover:rotate-12 transition-transform" />
                                            Admin 세션으로 원클릭 즉시 접속
                                        </button>

                                        {/* 구분선 */}
                                        <div className="flex items-center gap-3 my-2">
                                            <div className="flex-1 h-px bg-slate-800" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">OR DIRECT PASSKEY</span>
                                            <div className="flex-1 h-px bg-slate-800" />
                                        </div>

                                        {/* 2. 수동 마스터 키 입력 */}
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <input 
                                                    type="password"
                                                    value={terminalPasskey}
                                                    onChange={(e) => setTerminalPasskey(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUnlockWithKey()}
                                                    placeholder="마스터 키 (예: stock!234)"
                                                    className="w-full bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl px-5 py-3.5 text-center text-[var(--theme-text)] font-mono font-bold text-sm tracking-widest focus:border-indigo-500 outline-none transition-all shadow-inner"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleUnlockWithKey}
                                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black rounded-2xl text-[10px] uppercase tracking-wider transition-all border border-slate-700 active:scale-95"
                                            >
                                                마스터 키로 잠금 해제
                                            </button>
                                        </div>

                                        {/* 기억하기 체크박스 & 안내 */}
                                        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1">
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={rememberKey} 
                                                    onChange={(e) => setRememberKey(e.target.checked)} 
                                                    className="rounded border-slate-700 text-indigo-600 focus:ring-0" 
                                                />
                                                <span>이 브라우저에 마스터 키 기억</span>
                                            </label>
                                            <span className="text-slate-600 font-mono">stock!234 지원</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // 마스터 키 또는 Admin 세션 통과 시 진짜 터미널 렌더링
                                <RealTerminal passkey={terminalPasskey} onLock={() => setIsTerminalUnlocked(false)} />
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
                    <span className="text-[9px] font-black uppercase tracking-tighter">AI 터미널</span>
                </button>
            </div>
        </div>
    );
};

export default AdminFailureManagement;
