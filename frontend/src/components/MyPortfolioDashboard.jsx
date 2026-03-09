import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, TrendingUp, PieChart, Activity, Brain, 
    ArrowUpRight, ArrowDownRight, Newspaper, ChevronRight, 
    Target, Zap, Sparkles, RefreshCw, AlertCircle, X,
    Globe, Wallet, BarChart3, ChevronDown
} from 'lucide-react';
import classNames from 'classnames';
import { fetchPortfolioIntelligence } from '../api/stockApi';

const MyPortfolioDashboard = () => {
    const [holdings, setHoldings] = useState([]);
    const [aiInsight, setAiInsight] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const data = await fetchPortfolioIntelligence();
            if (data) {
                setHoldings(data.holdings || []);
                setAiInsight(data.aiInsight || "");
            }
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const totalEvaluation = holdings.reduce((acc, curr) => acc + (Number(curr.currentPrice || 0) * Number(curr.quantity || 0)), 0);
    const totalProfit = holdings.reduce((acc, curr) => acc + ((Number(curr.currentPrice || 0) - Number(curr.avgPrice || 0)) * Number(curr.quantity || 0)), 0);
    const totalProfitRate = totalEvaluation > 0 ? (totalProfit / (totalEvaluation - totalProfit)) * 100 : 0;

    let parsedInsights = null;
    try {
        if (aiInsight && typeof aiInsight === 'string' && aiInsight.trim().startsWith('[')) {
            parsedInsights = JSON.parse(aiInsight);
        } else if (Array.isArray(aiInsight)) {
            parsedInsights = aiInsight;
        }
    } catch (e) {
        parsedInsights = null;
    }

    const openDeepAnalysis = (stockCode) => {
        if (!parsedInsights) return;
        const targetCode = String(stockCode).trim();
        const insight = parsedInsights.find(i => String(i.stockCode).trim() === targetCode);
        if (insight) {
            setSelectedInsight(insight);
            setIsModalOpen(true);
        }
    };

    return (
        <div className="flex-1 bg-slate-950 p-4 lg:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col gap-8 animate-in fade-in duration-700 relative">
            {/* 🔝 HEADER */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden">
                        <ShieldCheck size={32} className="text-white relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic flex items-center gap-2">
                            bluetrio <span className="text-indigo-500">Black-Box</span>
                        </h1>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest opacity-80">Portfolio Intelligence Center v1.0</p>
                    </div>
                </div>
                <button onClick={fetchData} className="p-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all shadow-lg">
                    <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
            </header>

            {/* 🍩 TOP SECTION: DONUTS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-5 lg:p-6 shadow-2xl flex flex-col items-center gap-2 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
                        <PieChart size={18} className="text-indigo-400" /> Asset Allocation
                    </h3>
                    <div className="relative flex items-center justify-center py-4 scale-95 lg:scale-100">
                        <svg viewBox="0 0 200 200" className="w-48 h-48 transform -rotate-90">
                            <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="18" fill="transparent" className="text-slate-800" />
                            {holdings.map((h, i) => {
                                const colors = ["#6366f1", "#f43f5e", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
                                const ratio = totalEvaluation > 0 ? (Number(h.currentPrice || 0) * Number(h.quantity || 0)) / totalEvaluation : 0;
                                const circ = 2 * Math.PI * 85;
                                const visualLength = ratio > 0 ? Math.max(ratio * circ, 15) : 0;
                                let prevRatios = 0;
                                for(let j=0; j<i; j++) { prevRatios += (Number(holdings[j].currentPrice || 0) * Number(holdings[j].quantity || 0)) / totalEvaluation; }
                                return (
                                    <circle key={i} cx="100" cy="100" r="85" stroke={colors[i % colors.length]} strokeWidth="18" fill="transparent" strokeDasharray={circ} strokeDashoffset={circ - visualLength} transform={`rotate(${prevRatios * 360} 100 100)`} strokeLinecap="round" className="transition-all duration-1000" />
                                );
                            })}
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Value</span>
                            <span className="text-2xl lg:text-3xl font-black text-white font-mono">{(totalEvaluation/10000).toFixed(0)}만</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 w-full pt-4 border-t border-slate-800/50">
                        {holdings.map((h, i) => {
                            const ratio = totalEvaluation > 0 ? (Number(h.currentPrice || 0) * Number(h.quantity || 0) / totalEvaluation) * 100 : 0;
                            const colors = ["#6366f1", "#f43f5e", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
                            return (
                                <div key={i} className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }}></div>
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">
                                        {h.stockName} <span className="text-white ml-1">{ratio.toFixed(1)}%</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-5 lg:p-6 shadow-2xl flex flex-col items-center gap-2 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
                        <Target size={18} className="text-emerald-400" /> Profit Tracker
                    </h3>
                    <div className="relative flex items-center justify-center py-4 scale-95 lg:scale-100">
                        <svg viewBox="0 0 200 200" className="w-48 h-48 transform -rotate-90">
                            <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="18" fill="transparent" className="text-slate-800" />
                            <circle cx="100" cy="100" r="85" stroke="#10b981" strokeWidth="18" fill="transparent" strokeDasharray="534" strokeDashoffset={534 - (Math.abs(totalProfitRate) / 100 * 534)} strokeLinecap="round" className="transition-all duration-1000" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Profit Rate</span>
                            <span className={classNames("text-3xl lg:text-4xl font-black font-mono", totalProfitRate >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                {totalProfitRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="w-full pt-4 border-t border-slate-800/50 flex flex-col items-center gap-0.5 mb-1">
                        <p className="text-[10px] text-white font-bold uppercase tracking-[0.2em]">Strategy Influence Level</p>
                        <span className="text-[10px] text-slate-500 font-mono italic">Real-time Performance Monitoring</span>
                    </div>
                </div>
            </div>

            {/* 🤖 AI 관제탑: HIGH DENSITY MICRO CONSOLE */}
            <div className="bg-slate-900/80 border border-indigo-500/40 rounded-[3rem] p-4 lg:p-6 flex flex-col gap-2 shadow-2xl relative overflow-hidden min-h-[500px] max-h-[600px]">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Brain size={100} className="text-indigo-500" />
                </div>
                <div className="relative z-10 flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg border border-white/10">
                        <Sparkles className="text-white animate-pulse" size={20} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-indigo-400 font-black text-sm lg:text-base uppercase tracking-[0.3em] flex items-center gap-2">
                            <ShieldCheck size={18} /> AI 관제탑 (Control Tower)
                        </h4>
                        <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest opacity-70 italic leading-none">Tactical Intelligence v4.0</p>
                    </div>
                </div>
                
                <div className="relative z-10 w-full flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2 mt-1">
                    {!parsedInsights ? (
                        <p className="text-white text-[11px] font-black italic opacity-50 py-10 text-center uppercase">Awaiting Battle Data...</p>
                    ) : (
                        parsedInsights.map((insight, idx) => (
                            <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 lg:p-4 flex flex-col xl:flex-row gap-4 w-full hover:border-indigo-500/30 transition-all duration-300">
                                <div className="flex-[1.2] border-b xl:border-b-0 xl:border-r border-slate-800/50 pb-3 xl:pb-0 xl:pr-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="text-base lg:text-lg font-black text-white flex items-center gap-2">
                                            <Target size={16} className="text-indigo-400" /> {insight.stockName}
                                        </h5>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black font-mono text-indigo-400">HIT {insight.hitRate}%</span>
                                            <div className="flex gap-0.5">
                                                {[1,2,3,4,5].map(s => <div key={s} className={`w-1 h-1 rounded-full ${s <= (insight.hitRate/20) ? 'bg-indigo-500' : 'bg-slate-800'}`}></div>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        {Object.entries(insight.radar).filter(([k]) => k !== 'interpretation').map(([key, val]) => (
                                            <div key={key} className="flex items-center gap-3">
                                                <span className="w-10 text-[8px] font-black text-slate-500 uppercase">{key}</span>
                                                <div className="flex-1 h-1 bg-slate-900 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${key==='lstm' ? 'bg-indigo-500' : key==='tcn' ? 'bg-rose-500' : key==='quant' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                                        style={{width: `${val}%`}}
                                                    ></div>
                                                </div>
                                                <span className="w-7 text-right text-[10px] font-black font-mono text-white opacity-80">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[11px] text-slate-400 font-bold leading-tight break-keep italic">
                                        "{insight.radar.interpretation}"
                                    </p>
                                </div>
                                <div className="flex-1 flex flex-col gap-2 justify-center">
                                    <div className="bg-indigo-600/10 p-3 rounded-lg border border-indigo-500/20">
                                        <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest block mb-1">Prediction</span>
                                        <p className="text-white text-[12px] font-black leading-tight tracking-tight">{insight.scenario}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {insight.reasoning.map((r, i) => (
                                            <span key={i} className={classNames(
                                                "px-2 py-0.5 text-[9px] font-black rounded border",
                                                r.includes('🔥') || r.includes('Positive') ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                r.includes('❄️') || r.includes('Negative') ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                                "bg-slate-900 text-slate-400 border-slate-800"
                                            )}>{r}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 🗂️ HOLDINGS GRID: RESTORED WITH TACTICAL REASON TAGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                {holdings.map((stock, idx) => {
                    const profit = (Number(stock.currentPrice || 0) - Number(stock.avgPrice || 0)) * Number(stock.quantity || 0);
                    const profitRate = ((Number(stock.currentPrice || 0) - Number(stock.avgPrice || 0)) / Number(stock.avgPrice || 1)) * 100;
                    
                    // [복구] 전술 태그 파싱 로직
                    const tacticalTags = stock.aiReason ? stock.aiReason.split(',').map(t => t.trim()) : [];

                    return (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl hover:border-indigo-500/40 transition-all group flex flex-col gap-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h5 className="text-white font-black text-lg group-hover:text-indigo-400 transition-colors">{stock.stockName}</h5>
                                    <span className="text-xs font-bold text-slate-500 font-mono">{stock.stockCode}</span>
                                </div>
                                <div className={classNames("px-3 py-1 rounded-full text-[10px] font-black uppercase", profitRate >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20")}>
                                    {profitRate >= 0 ? '▲' : '▼'} {Math.abs(profitRate).toFixed(1)}%
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                                <div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Avg Price</span>
                                    <span className="text-sm font-bold text-white font-mono">{Number(stock.avgPrice || 0).toLocaleString()}₩</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Quantity</span>
                                    <span className="text-sm font-bold text-white font-mono">{Number(stock.quantity || 0).toLocaleString()}</span>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-white/5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Total P/L</span>
                                    <span className={classNames("text-base font-black font-mono", profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                        {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString()}₩
                                    </span>
                                </div>
                            </div>

                            {/* [복구] 11대 전술 태그 렌더링 영역 */}
                            <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                                {tacticalTags.map((tag, i) => (
                                    <span key={i} className={classNames(
                                        "px-2 py-0.5 text-[9px] font-black rounded border uppercase tracking-tighter transition-all",
                                        tag.includes('★') || tag.includes('폭발') || tag.includes('탈출') ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : 
                                        tag.includes('과매도') || tag.includes('주의') ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                        "bg-slate-800 text-slate-400 border-slate-700"
                                    )}>
                                        {tag}
                                    </span>
                                ))}
                                {tacticalTags.length === 0 && <span className="text-[9px] text-slate-600 italic">No tactical signals detected</span>}
                            </div>

                            <button 
                                onClick={() => openDeepAnalysis(stock.stockCode)}
                                className="w-full py-3 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-auto flex items-center justify-center gap-2"
                            >
                                Deep Analysis Report <ChevronRight size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* 🛡️ DEEP ANALYSIS MODAL */}
            {isModalOpen && selectedInsight && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10 animate-in fade-in zoom-in-95 duration-300">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-slate-900 border-2 border-indigo-500/30 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-6 lg:p-8 border-b border-white/5 flex items-center justify-between bg-indigo-600/10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10">
                                    <Brain size={32} className="text-white animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter uppercase">{selectedInsight.stockName} 심층 분석 보고서</h2>
                                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.4em]">Tactical Deep Intelligence Analysis</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-800 hover:bg-rose-600 text-white rounded-2xl transition-all shadow-lg"><X size={28} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10 custom-scrollbar text-white">
                            {/* 1. LTQX Quad Pulse */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(selectedInsight.radar).filter(([k]) => k !== 'interpretation').map(([key, val]) => (
                                    <div key={key} className="bg-slate-950/50 border border-slate-800 rounded-3xl p-6 flex flex-col items-center gap-4 relative group hover:border-indigo-500/30 transition-all">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{key} Energy</span>
                                        <div className="relative w-24 h-24 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="50%" cy="50%" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                                <circle cx="50%" cy="50%" r="40" stroke={key==='lstm' ? '#6366f1' : key==='tcn' ? '#f43f5e' : key==='quant' ? '#f59e0b' : '#10b981'} strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (val / 100 * 251)} strokeLinecap="round" className="transition-all duration-1000 shadow-2xl" />
                                            </svg>
                                            <span className="absolute text-xl font-black font-mono italic">{val}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] p-8 space-y-4">
                                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Activity size={20} className="text-indigo-400" /> Tactical Scenario</h3>
                                <p className="text-xl lg:text-2xl font-black leading-snug tracking-tight">{selectedInsight.scenario}</p>
                                <p className="text-slate-300 text-base lg:text-lg font-bold leading-relaxed italic border-l-4 border-indigo-500 pl-6 py-2 mt-6">"{selectedInsight.radar.interpretation}"</p>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] p-8 space-y-6">
                                    <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-3"><TrendingUp size={24} className="text-indigo-400" /> 실시간 수급 현황</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 text-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-2">외인 순매수</span>
                                            <span className={classNames("text-lg font-black font-mono", (selectedInsight.deep?.supply?.foreign || 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                {(selectedInsight.deep?.supply?.foreign || 0).toLocaleString()}주
                                            </span>
                                        </div>
                                        <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 text-center">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-2">기관 순매수</span>
                                            <span className="text-lg font-black font-mono text-slate-400">? (비공개)</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
                                    <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-3"><Newspaper size={24} className="text-indigo-400" /> 분석 근거 뉴스</h3>
                                    <div className="space-y-3">
                                        {(selectedInsight.deep?.news || []).map((news, i) => (
                                            <div key={i} className="p-3 bg-slate-950/50 rounded-xl border border-white/5 flex items-start gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                                                <p className="text-slate-300 text-xs font-bold leading-tight line-clamp-2">{news}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-white/5 bg-slate-950 flex justify-end">
                            <button onClick={() => setIsModalOpen(false)} className="px-14 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-[2rem] transition-all">지휘 확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPortfolioDashboard;
