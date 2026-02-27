import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Zap, PieChart, Activity, Sparkles, Target, ChevronLeft, ChevronRight, X, Brain, Gauge, ArrowUpRight, Anchor, ArrowUpCircle, ArrowDownCircle, HelpCircle, Info } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

const AdminIntelligenceDashboard = () => {
    const [data, setData] = useState({ heatmap: [], persistence: [], leaders: [], breadth: {}, aiSignals: [], hitRate: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('monitor'); 
    const [mobileTab, setMobileTab] = useState('overview'); 
    const [pollInterval, setPollInterval] = useState(180000);
    const [selectedSector, setSelectedSector] = useState(null);
    const [helpModal, setHelpModal] = useState(null); 
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchConfig = async () => {
        try {
            const res = await fetch('/stockPlus/api/admin/collector/config', { headers: getAuthHeader() });
            if (res.ok) {
                const cfg = await res.json();
                if (cfg.collect_interval) setPollInterval(cfg.collect_interval * 1000); 
            }
        } catch (e) {}
    };

    const fetchIntelData = async () => {
        try {
            const res = await fetch('/stockPlus/api/admin/intelligence/dashboard', { headers: getAuthHeader() });
            if (res.ok) setData(await res.json());
        } catch (e) {} 
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchConfig();
        fetchIntelData();
    }, []);

    useEffect(() => {
        if (!pollInterval) return;
        const interval = setInterval(fetchIntelData, pollInterval); 
        return () => clearInterval(interval);
    }, [pollInterval]);

    const totalPages = Math.ceil((data.persistence?.length || 0) / itemsPerPage);
    const paginatedThemes = data.persistence?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getHeatmapColor = (rate) => {
        const val = parseFloat(rate);
        if (val > 2.5) return 'bg-rose-600 shadow-lg shadow-rose-900/40';
        if (val > 1.0) return 'bg-rose-500';
        if (val > 0) return 'bg-rose-400';
        if (val < -2.5) return 'bg-blue-600 shadow-lg shadow-blue-900/40';
        if (val < -1.0) return 'bg-blue-500';
        if (val < 0) return 'bg-blue-400';
        return 'bg-slate-700';
    };

    const renderSupplyHelp = () => (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setHelpModal(null)}></div>
            <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white flex items-center gap-2"><Sparkles className="text-indigo-400" size={20} /> AI 수급 점수 가이드</h3>
                    <button onClick={() => setHelpModal(null)} className="p-1.5 bg-slate-800 rounded-full text-slate-400"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded">100%</span><span className="text-sm font-bold text-rose-400">MEGA FOREIGN BOMB</span></div>
                        <p className="text-[11px] text-slate-400">외국인이 단독으로 20억 이상의 자금을 쏟아붓는 주도주 신호입니다.</p>
                    </div>
                    <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black bg-cyan-500 text-white px-1.5 py-0.5 rounded">95%</span><span className="text-sm font-bold text-cyan-400">FOREIGN POWER BUY</span></div>
                        <p className="text-[11px] text-slate-400">외국인 순매수가 10억을 돌파하며 강력한 상승 에너지가 분출된 상태입니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAiTracker = () => (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-lg shadow-indigo-900/10 flex flex-col gap-3 h-full min-h-[300px]">
            <div className="flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs lg:text-sm font-black text-white flex items-center gap-2 uppercase tracking-tighter"><Sparkles size={16} className="text-indigo-400 animate-pulse" /> 실시간 AI 수급 포착</h2>
                    <button onClick={() => setHelpModal('supply')} className="text-slate-600 hover:text-indigo-400 transition-colors"><HelpCircle size={14} /></button>
                </div>
                <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar-thin space-y-2 pr-1">
                {data.aiSignals && data.aiSignals.length > 0 ? (
                    data.aiSignals.map((sig, i) => (
                        <div key={i} className="bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between group hover:border-indigo-500/50 transition-all animate-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-black text-white group-hover:text-indigo-300 transition-colors">{sig.stock_name}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-black text-indigo-400 bg-indigo-400/10 px-1 rounded border border-indigo-400/20 uppercase">{sig.signal_type.replace(/_/g, ' ')}</span>
                                    <span className="text-[8px] text-slate-500 font-mono italic">{new Date(sig.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[12px] font-black text-indigo-400">{sig.prediction_score}%</span>
                                <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${sig.prediction_score}%` }}></div></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 py-8 opacity-50"><Activity size={24} className="animate-pulse" /><p className="text-[10px] font-bold">수급 분석 중입니다...</p></div>
                )}
            </div>
        </div>
    );

    const renderAiStrategy = () => {
        const heatmap = data.heatmap || [];
        let avgScore = 50;
        if (heatmap.length > 0) {
            const validScores = heatmap.map(item => parseFloat(item.ai_score || 50)).filter(s => !isNaN(s));
            if (validScores.length > 0) avgScore = validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length;
        }
        const rotationList = [...heatmap].filter(item => (parseFloat(item.ai_score) || 50) > 55).sort((a, b) => (parseFloat(b.ai_score) || 0) - (parseFloat(a.ai_score) || 0)).slice(0, 5);
        const sentiment = avgScore >= 65 ? "상승 우위(Greed)" : (avgScore <= 35 ? "하락 우위(Fear)" : "중립(Neutral)");
        const sentimentColor = avgScore >= 65 ? "text-rose-400" : (avgScore <= 35 ? "text-blue-400" : "text-indigo-400");

        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto custom-scrollbar p-1 pb-10">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"><Activity className="text-emerald-400" size={24} /></div>
                        <div>
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">AI Prediction Hit Rate</h2>
                            <p className="text-[10px] text-slate-600 font-medium">(최근 7일 예측 성적)</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-emerald-400 font-mono">{data.hitRate || 0}%</span>
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${data.hitRate || 0}%` }}></div></div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden shrink-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 opacity-50"></div>
                    <div className="flex items-center gap-2 mb-8">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2"><Brain size={14} className="text-indigo-500" /> Market Intelligence Gauge</h2>
                    </div>
                    <div className="relative w-64 h-32 overflow-hidden">
                        <div className="absolute inset-0 border-[18px] border-slate-800 rounded-t-full"></div>
                        <div className={classNames("absolute inset-0 border-[18px] rounded-t-full transition-all duration-[1500ms] origin-bottom ease-out", avgScore >= 60 ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]" : (avgScore <= 40 ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-indigo-500"))} style={{ transform: `rotate(${(avgScore / 100) * 180 - 180}deg)` }}></div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center"><span className={classNames("text-5xl font-black tracking-tighter", sentimentColor)}>{Math.round(avgScore)}<span className="text-xl ml-0.5">%</span></span></div>
                    </div>
                    <p className={classNames("mt-6 text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-slate-950/50 border border-slate-800", sentimentColor)}>{sentiment}</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/50">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-black text-white flex items-center gap-2"><Target size={18} className="text-yellow-400" /> 순환매 예측</h2>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">LSTM v1 Model</span>
                    </div>
                    <div className="space-y-3">
                        {rotationList.length > 0 ? rotationList.map((sect, i) => (
                            <div key={i} className="bg-slate-950/50 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 flex items-center justify-between group transition-all">
                                <div className="flex items-center gap-4"><span className="text-lg font-black text-slate-700 italic group-hover:text-indigo-500 transition-colors">#{i+1}</span><div><div className="text-sm font-bold text-white mb-0.5">{sect.industry_name}</div><div className="flex items-center gap-2"><span className="text-[10px] text-slate-500">현재 등락</span><span className={classNames("text-[10px] font-bold", parseFloat(sect.change_rate) > 0 ? "text-rose-400" : "text-blue-400")}>{sect.change_rate}%</span></div></div></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 uppercase mb-1">AI Score</div>
                                    <div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${sect.ai_score || 50}%` }}></div></div><span className="text-sm font-black text-indigo-400">{parseInt(sect.ai_score || 50)}</span></div></div>
                            </div>
                        )) : <div className="text-center py-8 text-slate-500 text-xs">뚜렷한 상승 주도 업종이 포착되지 않았습니다.</div>}
                    </div>
                </div>
            </div>
        );
    };

    const renderMonitor = () => (
        <>
            <div className={classNames("flex flex-col gap-4 shrink-0", mobileTab !== 'overview' && 'hidden lg:flex')}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20"><span className="text-[9px] font-black text-slate-500 uppercase mb-1">상승 업종 비율 (ADR)</span><div className="flex items-baseline justify-between"><span className="text-xl lg:text-2xl font-black text-rose-400">{data.breadth?.rising_count || 0} <span className="text-[8px] text-slate-600">SEC</span></span><span className="text-[10px] font-black text-indigo-400">{((data.breadth?.rising_count / (data.breadth?.rising_count + data.breadth?.falling_count || 1)) * 100).toFixed(0)}%</span></div></div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20"><span className="text-[9px] font-black text-slate-500 uppercase mb-1">하락 비중</span><div className="flex items-baseline justify-between"><span className="text-xl lg:text-2xl font-black text-blue-400">{data.breadth?.falling_count || 0} <span className="text-[8px] text-slate-600">SEC</span></span><span className="text-[10px] font-black text-slate-500">{((data.breadth?.falling_count / (data.heatmap?.length || 1)) * 100).toFixed(0)}%</span></div></div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20"><span className="text-[9px] font-black text-slate-500 uppercase mb-1">시장 강도</span><div className="flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" /><span className="text-xl lg:text-2xl font-black text-indigo-400 font-mono">{((data.breadth?.rising_count / (data.breadth?.falling_count || 1)) * 100).toFixed(1)}%</span></div></div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20 overflow-hidden"><span className="text-[9px] font-black text-slate-500 uppercase mb-1">Top Sector</span><div className="flex flex-col justify-center h-full">{data.heatmap && data.heatmap.length > 0 ? (<><span className="text-[11px] lg:text-sm font-black text-white truncate w-full">{data.heatmap[0].industry_name}</span><span className={classNames("text-[10px] lg:text-xs font-black mt-0.5", parseFloat(data.heatmap[0].change_rate) > 0 ? "text-rose-400" : "text-blue-400")}>{parseFloat(data.heatmap[0].change_rate) > 0 ? '+' : ''}{data.heatmap[0].change_rate}%</span></>) : (<div className="text-[9px] text-slate-500 font-bold">Wait...</div>)}</div></div>
                </div>
                <div className="lg:hidden">{renderAiTracker()}</div>
            </div>
            <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
                <div className="hidden lg:flex lg:col-span-3 flex-col h-full overflow-hidden">{renderAiTracker()}</div>
                <div className={classNames("col-span-12 lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-2xl flex flex-col h-full overflow-hidden", mobileTab !== 'heatmap' && 'hidden lg:flex')}>
                    <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0"><h2 className="text-sm lg:text-lg font-bold text-white flex items-center gap-2"><PieChart size={18} className="text-indigo-400" /> 업종 등락 히트맵</h2><span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">Top 50</span></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-2.5 overflow-y-auto custom-scrollbar-thin pr-1 flex-1 pb-2 content-start">
                        {data.heatmap?.map((item, idx) => (
                            <div key={idx} className={classNames("relative aspect-[1.2/1] lg:aspect-[4/3] rounded-lg lg:rounded-xl p-1.5 lg:p-3 flex flex-col justify-center items-center lg:justify-between lg:items-start transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border border-white/5 text-center lg:text-left", getHeatmapColor(item.change_rate))}>
                                {item.ai_signal === 'BUY' && <div className="absolute top-1 right-1 flex items-center justify-center"><ArrowUpCircle className="text-white fill-rose-500 animate-pulse" size={14} /></div>}
                                {item.ai_signal === 'SELL' && <div className="absolute top-1 right-1 flex items-center justify-center"><ArrowDownCircle className="text-white fill-blue-500" size={14} /></div>}
                                <span className="text-[9px] lg:text-[11px] font-black text-white leading-tight drop-shadow-md truncate w-full px-1">{item.industry_name}</span>
                                <div className="mt-0.5 lg:mt-0 lg:text-right w-full"><span className="text-[10px] lg:text-sm font-black text-white drop-shadow-md">{parseFloat(item.change_rate) > 0 ? '+' : ''}{item.change_rate}%</span></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={classNames("col-span-12 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-2xl flex flex-col h-full overflow-hidden", mobileTab !== 'themes' && 'hidden lg:flex')}>
                    <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0"><h2 className="text-sm lg:text-lg font-bold text-white flex items-center gap-2"><Zap size={18} className="text-yellow-400" /> Hot Themes</h2>
                        <div className="flex items-center gap-1.5"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded-md bg-slate-800 text-slate-400 disabled:opacity-30"><ChevronLeft size={14} /></button><span className="text-[10px] font-black text-slate-500 font-mono">{currentPage}/{totalPages || 1}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded-md bg-slate-800 text-slate-400 disabled:opacity-30"><ChevronRight size={14} /></button></div>
                    </div>
                    <div className="space-y-2 lg:space-y-3 overflow-y-auto custom-scrollbar-thin pr-1 flex-1 pb-2">
                        {paginatedThemes?.map((theme, idx) => (
                            <div key={idx} className="bg-slate-950/50 border border-slate-800/50 rounded-xl lg:rounded-2xl p-3 flex flex-col gap-1.5 hover:border-indigo-500/50 transition-all shadow-inner group">
                                <div className="flex justify-between items-start"><div className="flex items-center gap-2 flex-1 min-w-0 mr-2"><span className="text-[11px] lg:text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">{theme.theme_name}</span><span className={classNames("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border", parseFloat(theme.total_score) >= 10 ? "text-rose-400 border-rose-400/20 bg-rose-400/10" : "text-slate-500 border-slate-700 bg-slate-800")}>{parseFloat(theme.total_score) >= 10 ? 'Hot' : 'Normal'}</span></div><span className="text-[11px] font-black text-white">{parseFloat(theme.total_score || 0).toFixed(1)}</span></div>
                                <div className="bg-slate-900 rounded-lg border border-slate-800 w-full p-2 flex items-start gap-2"><Target size={10} className="text-cyan-500 shrink-0 mt-1" /><span className="text-[9px] font-bold text-slate-300 break-all leading-relaxed">{theme.lead_stocks || '-'}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex-1 bg-slate-950 p-3 lg:p-8 overflow-y-auto custom-scrollbar h-full flex flex-col gap-4 lg:gap-6 relative pb-20 lg:pb-5">
            <header className="flex justify-between items-end shrink-0">
                <div><div className="flex items-center gap-3 mb-1"><div className="p-1.5 bg-indigo-600/20 rounded-lg border border-indigo-500/30"><LayoutDashboard className="text-indigo-400" size={20} /></div><h1 className="text-lg lg:text-2xl font-black text-white tracking-tight uppercase italic">Intelligence</h1></div><p className="text-slate-500 text-[9px] lg:text-xs font-bold uppercase tracking-widest opacity-80">v1 Advanced Engine</p></div>
                <div className="hidden lg:flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('monitor')} className={classNames("px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2", activeTab === 'monitor' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}><Activity size={12}/> MONITOR</button>
                    <button onClick={() => setActiveTab('strategy')} className={classNames("px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2", activeTab === 'strategy' ? "bg-rose-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}><Brain size={12}/> AI STRATEGY</button>
                </div>
            </header>
            {(activeTab === 'monitor' && mobileTab !== 'ai_strategy') ? renderMonitor() : null}
            {((activeTab === 'strategy' && window.innerWidth >= 1024) || mobileTab === 'ai_strategy') ? renderAiStrategy() : null}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around items-center h-16 lg:hidden z-50 pb-safe">
                <button onClick={() => setMobileTab('overview')} className={classNames("flex flex-col items-center gap-1 p-2 w-full transition-colors", mobileTab === 'overview' ? "text-indigo-400" : "text-slate-500")}><Activity size={20} /><span className="text-[10px] font-bold">대시보드</span></button>
                <button onClick={() => setMobileTab('heatmap')} className={classNames("flex flex-col items-center gap-1 p-2 w-full transition-colors", mobileTab === 'heatmap' ? "text-indigo-400" : "text-slate-500")}><PieChart size={20} /><span className="text-[10px] font-bold">히트맵</span></button>
                <button onClick={() => setMobileTab('themes')} className={classNames("flex flex-col items-center gap-1 p-2 w-full transition-colors", mobileTab === 'themes' ? "text-indigo-400" : "text-slate-500")}><Zap size={20} /><span className="text-[10px] font-bold">핫 테마</span></button>
                <button onClick={() => setMobileTab('ai_strategy')} className={classNames("flex flex-col items-center gap-1 p-2 w-full transition-colors", mobileTab === 'ai_strategy' ? "text-rose-400" : "text-slate-500")}><Brain size={20} /><span className="text-[10px] font-bold">AI 전략</span></button>
            </div>
            {selectedSector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSector(null)}></div>
                    <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-800 bg-slate-850 flex justify-between items-center"><div className="flex-1 mr-2"><h3 className="text-lg font-black text-white leading-tight break-keep">{selectedSector.industry_name}</h3><span className={classNames("text-sm font-bold", parseFloat(selectedSector.change_rate) > 0 ? "text-rose-400" : "text-blue-400")}>{parseFloat(selectedSector.change_rate) > 0 ? '+' : ''}{selectedSector.change_rate}%</span></div><button onClick={() => setSelectedSector(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors shrink-0"><X size={20} /></button></div>
                        <div className="p-6"><h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2"><Target size={14} className="text-cyan-500" /> Leading Stocks</h4><div className="flex flex-wrap gap-2">{selectedSector.lead_stocks ? (selectedSector.lead_stocks.split(',').map((stock, i) => (<span key={i} className="px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 hover:border-indigo-500 hover:text-indigo-400 transition-colors cursor-default whitespace-normal h-auto text-center">{stock.trim()}</span>))) : (<p className="text-sm text-slate-500 italic">데이터 분석 중...</p>)}</div></div>
                    </div>
                </div>
            )}
            {helpModal === 'supply' && renderSupplyHelp()}
            {helpModal === 'rotation' && renderRotationHelp()}
            {helpModal === 'gauge' && renderGaugeHelp()}
        </div>
    );
};

export default AdminIntelligenceDashboard;
