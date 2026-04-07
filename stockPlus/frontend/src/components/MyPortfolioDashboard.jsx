import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, TrendingUp, PieChart, Activity, Brain, 
    ArrowUpRight, ArrowDownRight, Newspaper, ChevronRight, 
    Target, Zap, Sparkles, RefreshCw, AlertCircle, X,
    Globe, Wallet, BarChart3, ChevronDown
} from 'lucide-react';
import classNames from 'classnames';
import { fetchPortfolioIntelligence } from '../api/stockApi';

import { useNavigate } from 'react-router-dom';

const MyPortfolioDashboard = () => {
    const navigate = useNavigate();
    const [holdings, setHoldings] = useState([]);
    const [aiInsight, setAiInsight] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // [v36.55] Zero-Trust UI Security: ADMIN 권한 확인 및 미승인 시 즉시 퇴출
    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'ADMIN') {
            console.error(">>> [SECURITY ALERT] Unauthorized access attempt to Portfolio Intelligence Center.");
            alert("관리자 전용 영역입니다. 접근 권한이 없습니다.");
            navigate('/');
        }
    }, [navigate]);

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
        let rawInsights = null;
        if (aiInsight && typeof aiInsight === 'string' && aiInsight.trim().startsWith('[')) {
            rawInsights = JSON.parse(aiInsight);
        } else if (Array.isArray(aiInsight)) {
            rawInsights = aiInsight;
        }

        if (rawInsights && holdings.length > 0) {
            const holdingCodes = new Set(holdings.map(h => String(h.stockCode).trim()));
            parsedInsights = rawInsights.filter(i => holdingCodes.has(String(i.stockCode).trim()));
        } else {
            parsedInsights = rawInsights;
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
        <div className="flex-1 bg-[var(--theme-bg)] transition-colors duration-500 p-4 lg:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col gap-8 animate-in fade-in duration-700 relative text-[var(--theme-text)]">
            {/* 🔝 HEADER */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
                <div className="flex items-center gap-4 transition-colors">
                    <button 
                        onClick={() => navigate('/')} 
                        className="w-12 h-12 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 text-slate-500 hover:text-[var(--theme-text)] rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg group transition-colors"
                    >
                        <ChevronRight size={24} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                    </button>

                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden transition-colors">
                        <ShieldCheck size={32} className="text-white relative z-10" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    <div className="transition-colors">
                        <h1 className="text-2xl font-black text-[var(--theme-text)] tracking-tighter uppercase italic flex items-center gap-2 transition-colors">
                            bluetrio <span className="text-indigo-600 transition-colors">Black-Box</span>
                        </h1>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest opacity-80 transition-colors">Portfolio Intelligence Center v1.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 transition-colors">
                    <button onClick={fetchData} className="p-3 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 text-slate-500 hover:text-[var(--theme-text)] rounded-2xl transition-all active:scale-95 shadow-lg transition-colors">
                        <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            {/* 🍩 TOP SECTION: DONUTS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 transition-colors">
                <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-[2.5rem] p-5 lg:p-6 shadow-2xl flex flex-col items-center gap-2 relative overflow-hidden group transition-colors">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
                    <h3 className="text-[var(--theme-text)] font-black text-sm uppercase tracking-[0.3em] flex items-center gap-2 mt-1 transition-colors">
                        <PieChart size={18} className="text-indigo-600 transition-colors" /> Asset Allocation
                    </h3>
                    <div className="relative flex items-center justify-center py-4 scale-95 lg:scale-100 transition-colors">
                        <svg viewBox="0 0 200 200" className="w-48 h-48 transform -rotate-90">
                            <circle cx="100" cy="100" r="85" stroke="var(--theme-border)" strokeWidth="18" fill="transparent" className="opacity-50 transition-colors" />
                            {holdings.map((h, i) => {
                                const colors = ["#6366f1", "#f43f5e", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
                                const ratio = totalEvaluation > 0 ? (Number(h.currentPrice || 0) * Number(h.quantity || 0)) / totalEvaluation : 0;
                                const circ = 2 * Math.PI * 85;
                                const visualLength = ratio > 0 ? Math.max(ratio * circ, 25) : 0;
                                let prevRatios = 0;
                                for(let j=0; j<i; j++) { prevRatios += (Number(holdings[j].currentPrice || 0) * Number(holdings[j].quantity || 0)) / totalEvaluation; }
                                return (
                                    <circle key={i} cx="100" cy="100" r="85" stroke={colors[i % colors.length]} strokeWidth="18" fill="transparent" strokeDasharray={circ} strokeDashoffset={circ - visualLength} transform={`rotate(${prevRatios * 360} 100 100)`} strokeLinecap="round" className="transition-all duration-1000" />
                                );
                            })}
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center transition-colors">
                            <span className="text-sm font-black text-slate-500 uppercase tracking-tighter transition-colors">Value</span>
                            <span className="text-2xl lg:text-3xl font-black text-[var(--theme-text)] font-mono transition-colors">{(totalEvaluation/10000).toFixed(0)}만</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 w-full pt-4 border-t border-[var(--theme-border)] transition-colors duration-500/50 mb-1 transition-colors">
                        {holdings.map((h, i) => {
                            const ratio = totalEvaluation > 0 ? (Number(h.currentPrice || 0) * Number(h.quantity || 0) / totalEvaluation) * 100 : 0;
                            const colors = ["#6366f1", "#f43f5e", "#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
                            return (
                                <div key={i} className="flex items-center gap-1.5 transition-colors">
                                    <div className="w-2.5 h-2.5 rounded-sm transition-colors" style={{ backgroundColor: colors[i % colors.length] }}></div>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter transition-colors">
                                        {h.stockName} <span className="text-[var(--theme-text)] ml-0.5 transition-colors">{ratio.toFixed(1)}%</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-[2.5rem] p-5 lg:p-6 shadow-2xl flex flex-col items-center gap-2 relative overflow-hidden group transition-colors">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                    <h3 className="text-[var(--theme-text)] font-black text-sm uppercase tracking-[0.3em] flex items-center gap-2 mt-1 transition-colors">
                        <Target size={18} className="text-emerald-600 transition-colors" /> Profit Tracker
                    </h3>
                    <div className="relative flex items-center justify-center py-4 scale-95 lg:scale-100 transition-colors">
                        <svg viewBox="0 0 200 200" className="w-48 h-48 transform -rotate-90 transition-colors">
                            <circle cx="100" cy="100" r="85" stroke="var(--theme-border)" strokeWidth="18" fill="transparent" className="opacity-50 transition-colors" />
                            <circle cx="100" cy="100" r="85" stroke="#10b981" strokeWidth="18" fill="transparent" strokeDasharray="534" strokeDashoffset={534 - (Math.abs(totalProfitRate) / 100 * 534)} strokeLinecap="round" className="transition-all duration-1000" />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center transition-colors">
                            <span className="text-sm font-black text-slate-500 uppercase tracking-tighter transition-colors">Profit Rate</span>
                            <span className={classNames("text-3xl lg:text-4xl font-black font-mono transition-colors", totalProfitRate >= 0 ? "text-red-600" : "text-blue-600")}>
                                {totalProfitRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="w-full pt-4 border-t border-[var(--theme-border)] transition-colors duration-500/50 flex flex-col items-center gap-0.5 mb-1 transition-colors">
                        <p className="text-[10px] text-[var(--theme-text)] font-black uppercase tracking-[0.2em] transition-colors">Strategy Influence Level</p>
                        <span className="text-[10px] text-slate-500 font-mono italic transition-colors">Real-time Performance Monitoring</span>
                    </div>
                </div>
            </div>

            {/* 🤖 AI 관제탑: FULL FONT SCALE-UP v3.9 */}
            <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-[2.5rem] p-4 lg:p-6 flex flex-col gap-2 shadow-2xl relative overflow-hidden min-h-[500px] max-h-[650px] transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-colors">
                    <Brain size={100} className="text-indigo-600" />
                </div>
                <div className="relative z-10 flex items-center gap-3 px-2 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg border border-white/10 transition-colors">
                        <Sparkles className="text-white animate-pulse" size={20} />
                    </div>
                    <div className="flex-1 transition-colors">
                        <h4 className="text-indigo-600 font-black text-sm lg:text-base uppercase tracking-[0.3em] flex items-center gap-2 transition-colors">
                            <ShieldCheck size={16} /> AI 관제탑 (Control Tower)
                        </h4>
                    </div>
                </div>
                
                <div className="relative z-10 w-full flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2 mt-1 transition-colors">
                    {!parsedInsights ? (
                        <p className="text-[var(--theme-text)] text-[12px] font-black italic opacity-50 py-10 text-center transition-colors">Awaiting Battle Data...</p>
                    ) : (
                        parsedInsights.map((insight, idx) => (
                            <div key={idx} className="bg-[var(--theme-bg)] transition-colors duration-500/50 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl p-3 lg:p-4 flex flex-col xl:flex-row gap-4 w-full hover:border-indigo-500/30 transition-all duration-300 transition-colors shadow-sm">
                                <div className="flex-[1.2] border-b xl:border-b-0 xl:border-r border-[var(--theme-border)] transition-colors duration-500/50 pb-3 xl:pb-0 xl:pr-4 transition-colors">
                                    <div className="flex justify-between items-center mb-2 transition-colors">
                                        <h5 className="text-lg lg:text-xl font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors">
                                            <Target size={18} className="text-indigo-600 transition-colors" /> {insight.stockName}
                                        </h5>
                                        <div className="flex flex-col items-end scale-100 leading-none transition-colors">
                                            <span className="text-[11px] font-black font-mono text-indigo-600 transition-colors">PROB {insight.hitRate}%</span>
                                            <div className="flex gap-0.5 mt-1 transition-colors">
                                                {[1,2,3,4,5].map(s => <div key={s} className={`w-1 h-1 rounded-full transition-colors ${s <= (insight.hitRate/20) ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 transition-colors">
                                        {Object.entries(insight.radar).filter(([k]) => k !== 'interpretation').map(([key, val]) => (
                                            <div key={key} className="flex items-center gap-3 transition-colors">
                                                <span className="w-10 text-[9px] font-black text-slate-500 uppercase transition-colors">{key}</span>
                                                <div className="flex-1 h-1.5 bg-[var(--theme-header)] transition-colors duration-500 rounded-full overflow-hidden transition-colors shadow-inner">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ${key==='lstm' ? 'bg-indigo-600' : key==='tcn' ? 'bg-rose-600' : key==='quant' ? 'bg-amber-600' : key==='smart' ? 'bg-orange-600' : 'bg-emerald-600'}`} 
                                                        style={{width: `${val}%`}}
                                                    ></div>
                                                </div>
                                                <span className="w-8 text-right text-[11px] font-black font-mono text-[var(--theme-text)] opacity-80 transition-colors">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-[12px] text-slate-500 font-black leading-tight break-keep italic opacity-90 transition-colors">
                                        "{insight.radar.interpretation}"
                                    </p>
                                </div>
                                <div className="flex-1 flex flex-col gap-2 justify-center transition-colors">
                                    <div className="bg-indigo-600/10 p-3 rounded-lg border border-indigo-500/20 transition-colors">
                                        <span className="text-[10px] text-indigo-600 font-black uppercase tracking-widest block mb-1 leading-none transition-colors">Prediction</span>
                                        <p className="text-[var(--theme-text)] text-[13px] font-black leading-tight tracking-tight transition-colors">{insight.scenario}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 justify-start transition-colors">
                                        <span className="px-2 py-0.5 text-[10px] font-black rounded border bg-indigo-500/20 text-indigo-600 border-indigo-500/30 leading-none h-6 flex items-center justify-center transition-colors">TOTAL {insight.total_score || 0}점</span>
                                        {insight.reasoning.map((r, i) => (
                                            <span key={i} className={classNames(
                                                "px-2 py-0.5 text-[10px] font-black rounded border leading-none h-6 flex items-center justify-center transition-all transition-colors",
                                                r.includes('고수익') || r.includes('고성장') ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                                r.includes('수급포착') || r.includes('폭발') ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                                r.includes('🔥') || r.includes('Positive') ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                r.includes('❄️') || r.includes('Negative') ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                                "bg-[var(--theme-header)] transition-colors duration-500 text-slate-500 border-[var(--theme-border)] transition-colors duration-500"
                                            )}>{r}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 🗂️ HOLDINGS GRID: REASON 폰트 상향 적용 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10 transition-colors">
                {holdings.map((stock, idx) => {
                    const profit = (Number(stock.currentPrice || 0) - Number(stock.avgPrice || 0)) * Number(stock.quantity || 0);
                    const profitRate = ((Number(stock.currentPrice || 0) - Number(stock.avgPrice || 0)) / Number(stock.avgPrice || 1)) * 100;
                    const stockInsight = parsedInsights ? parsedInsights.find(i => String(i.stockCode).trim() === String(stock.stockCode).trim()) : null;
                    const tacticalTags = stockInsight ? stockInsight.reasoning.filter(r => !r.includes(':')) : [];

                    return (
                        <div key={idx} className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-3xl p-6 shadow-xl hover:border-indigo-500/40 transition-all group flex flex-col gap-5 transition-colors">
                            <div className="flex justify-between items-start transition-colors">
                                <div>
                                    <h5 className="text-[var(--theme-text)] font-black text-lg group-hover:text-indigo-600 transition-colors">{stock.stockName}</h5>
                                    <span className="text-xs font-black text-slate-500 font-mono transition-colors">{stock.stockCode}</span>
                                </div>
                                <div className={classNames("px-3 py-1 rounded-full text-[10px] font-black uppercase transition-colors", profitRate >= 0 ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20")}>
                                    {profitRate >= 0 ? '▲' : '▼'} {Math.abs(profitRate).toFixed(1)}%
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-[var(--theme-bg)] transition-colors duration-500/50 p-4 rounded-2xl border border-[var(--theme-border)] transition-colors duration-500 shadow-inner transition-colors">
                                <div className="transition-colors">
                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1 transition-colors">Avg Price</span>
                                    <span className="text-sm font-black text-[var(--theme-text)] font-mono transition-colors">{Number(stock.avgPrice || 0).toLocaleString()}₩</span>
                                </div>
                                <div className="transition-colors">
                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1 transition-colors">Quantity</span>
                                    <span className="text-sm font-black text-[var(--theme-text)] font-mono transition-colors">{Number(stock.quantity || 0).toLocaleString()}</span>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-[var(--theme-border)]/50 transition-colors">
                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1 transition-colors">Total P/L</span>
                                    <span className={classNames("text-base font-black font-mono transition-colors", profit >= 0 ? "text-red-600" : "text-blue-600")}>
                                        {profit >= 0 ? '+' : ''}{Math.round(profit).toLocaleString()}₩
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 justify-start -mt-2 transition-colors">
                                {tacticalTags.map((tag, i) => (
                                    <span key={i} className={classNames(
                                        "px-2.5 py-0 text-[10px] font-black rounded border uppercase tracking-tighter leading-none h-6 flex items-center justify-center transition-all transition-colors",
                                        tag.includes('고수익') || tag.includes('고성장') || tag.includes('★') ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : 
                                        tag.includes('수급') || tag.includes('폭발') ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                        tag.includes('과매도') || tag.includes('주의') ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                                        "bg-[var(--theme-header)] transition-colors duration-500 text-slate-500 border-[var(--theme-border)] transition-colors duration-500 shadow-sm"
                                    )}>
                                        {tag}
                                    </span>
                                ))}
                                {tacticalTags.length === 0 && <span className="text-[9px] text-slate-500 font-black italic transition-colors">No tactical signals</span>}
                            </div>

                            <button 
                                onClick={() => openDeepAnalysis(stock.stockCode)}
                                className="w-full py-2.5 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-1 flex items-center justify-center gap-2 transition-colors shadow-lg active:scale-95"
                            >
                                Deep Analysis Report <ChevronRight size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* 🛡️ DEEP ANALYSIS MODAL */}
            {isModalOpen && selectedInsight && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10 animate-in fade-in zoom-in-95 duration-300 transition-colors">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-colors" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-[var(--theme-header)] transition-colors duration-500 border-2 border-[var(--theme-border)] transition-colors duration-500 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-colors">
                        <div className="p-6 lg:p-8 border-b border-[var(--theme-border)] bg-[var(--theme-bg)] transition-colors duration-500 flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-4 transition-colors">
                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 transition-colors">
                                    <Brain size={32} className="text-white animate-pulse" />
                                </div>
                                <div className="transition-colors">
                                    <h2 className="text-2xl lg:text-3xl font-black text-[var(--theme-text)] tracking-tighter uppercase transition-colors">{selectedInsight.stockName} 심층 분석 보고서</h2>
                                    <p className="text-indigo-600 text-xs font-black uppercase tracking-[0.4em] transition-colors">Tactical Deep Intelligence Analysis</p>
                                    <div className="flex flex-wrap gap-1.5 mt-3 transition-colors">
                                        {selectedInsight.reasoning.filter(r => !r.includes(':')).map((r, i) => (
                                            <span key={i} className={classNames(
                                                "px-2.5 py-1 text-[10px] font-black rounded border uppercase tracking-tighter leading-none transition-all transition-colors",
                                                r.includes('고수익') || r.includes('고성장') || r.includes('★') ? "bg-blue-500/10 text-blue-600 border-blue-500/30" : 
                                                r.includes('수급') || r.includes('폭발') ? "bg-purple-500/10 text-purple-600 border-purple-500/30" :
                                                r.includes('과매도') || r.includes('주의') || r.includes('과열') ? "bg-rose-500/10 text-rose-600 border-rose-500/30" :
                                                "bg-[var(--theme-bg)] transition-colors duration-500 text-slate-500 border-[var(--theme-border)] transition-colors duration-500 shadow-sm"
                                            )}>{r}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-[var(--theme-bg)] hover:bg-rose-600 text-slate-500 hover:text-white rounded-2xl transition-all shadow-lg active:scale-95 transition-colors"><X size={28} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10 custom-scrollbar text-[var(--theme-text)] transition-colors">
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 transition-colors">
                                {Object.entries(selectedInsight.radar).filter(([k]) => k !== 'interpretation').map(([key, val]) => (
                                    <div key={key} className="bg-[var(--theme-bg)] transition-colors duration-500/50 border border-[var(--theme-border)] transition-colors duration-500 rounded-3xl p-6 flex flex-col items-center gap-4 relative group hover:border-indigo-500/30 transition-all transition-colors shadow-inner">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest transition-colors">{key} Energy</span>
                                        <div className="relative w-24 h-24 flex items-center justify-center transition-colors">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="50%" cy="50%" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-300 opacity-10 transition-colors" />
                                                <circle cx="50%" cy="50%" r="40" stroke={key==='lstm' ? '#6366f1' : key==='tcn' ? '#f43f5e' : key==='quant' ? '#f59e0b' : key==='smart' ? '#f97316' : '#10b981'} strokeWidth="8" fill="transparent" strokeDasharray="251" strokeDashoffset={251 - (val / 100 * 251)} strokeLinecap="round" className="transition-all duration-1000 shadow-2xl" />
                                            </svg>
                                            <span className="absolute text-xl font-black font-mono italic transition-colors">{val}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[2rem] p-8 space-y-4 transition-colors">
                                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-colors"><Activity size={20} className="text-indigo-600" /> Tactical Scenario</h3>
                                <p className="text-xl lg:text-2xl font-black leading-snug tracking-tight transition-colors">{selectedInsight.scenario}</p>
                                <p className="text-slate-500 text-base lg:text-lg font-black leading-relaxed italic border-l-4 border-indigo-600 pl-6 py-2 mt-6 transition-colors">"{selectedInsight.radar.interpretation}"</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 transition-colors">
                                <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 border border-amber-500/20 rounded-[2rem] p-6 space-y-4 transition-colors shadow-inner">
                                    <div className="flex items-center gap-2 text-amber-600 transition-colors"><ShieldCheck size={20} /><h4 className="text-[11px] font-black uppercase tracking-widest transition-colors">Whale Tracker</h4></div>
                                    <div className="text-center transition-colors"><span className="text-[22px] font-black font-mono text-[var(--theme-text)] block transition-colors">{selectedInsight.deep?.whale?.cost ? `${selectedInsight.deep.whale.cost.toLocaleString()}₩` : "분석 중"}</span><p className="text-[10px] text-amber-700 font-black mt-2 leading-relaxed transition-colors">{selectedInsight.deep?.whale?.advice || "거래량 분석 중"}</p></div>
                                </div>
                                <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 border border-indigo-500/20 rounded-[2rem] p-6 space-y-4 transition-colors shadow-inner">
                                    <div className="flex items-center gap-2 text-indigo-600 transition-colors"><TrendingUp size={20} /><h4 className="text-[11px] font-black uppercase tracking-widest transition-colors">Supply Momentum</h4></div>
                                    <div className="text-center transition-colors"><span className={classNames("text-[22px] font-black font-mono block transition-colors", (selectedInsight.deep?.supply?.foreign || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>{(selectedInsight.deep?.supply?.foreign || 0).toLocaleString()}주</span><p className="text-[10px] text-slate-500 font-black mt-2 uppercase tracking-tight transition-colors">외인 순매수 (Live)</p></div>
                                </div>
                                <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 border border-emerald-500/20 rounded-[2rem] p-6 space-y-4 transition-colors shadow-inner">
                                    <div className="flex items-center gap-2 text-emerald-600 transition-colors"><Globe size={20} /><h4 className="text-[11px] font-black uppercase tracking-widest transition-colors">Sector Intelligence</h4></div>
                                    <div className="text-center transition-colors"><span className="text-[16px] font-black text-[var(--theme-text)] block leading-tight transition-colors">{selectedInsight.deep?.sector?.status || "섹터 분석 중"}</span><p className="text-[10px] text-emerald-700 font-black mt-2 leading-relaxed transition-colors">{selectedInsight.deep?.sector?.advice || "산업군 동조화 분석 중"}</p></div>
                                </div>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 border border-[var(--theme-border)] transition-colors duration-500 rounded-[2.5rem] p-8 space-y-6 transition-colors shadow-inner">
                                <div className="flex items-center justify-between transition-colors"><div className="flex items-center gap-3 transition-colors"><TrendingUp size={24} className="text-indigo-600" /><h3 className="text-[var(--theme-text)] font-black text-lg uppercase tracking-widest transition-colors">Multi-Whale Intelligence</h3></div><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-[var(--theme-header)] transition-colors duration-500 px-3 py-1 rounded-full border border-[var(--theme-border)] transition-colors duration-500 shadow-sm transition-colors">Live Flow Analysis</span></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 transition-colors">
                                    <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-indigo-500/20 rounded-[2rem] p-6 space-y-4 group/f transition-colors shadow-md"><div className="flex items-center gap-4 transition-colors"><div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-600 group-hover/f:bg-indigo-600 group-hover/f:text-white transition-all"><Globe size={24} /></div><div><span className="text-[10px] text-slate-500 font-black uppercase block transition-colors">Foreigner Cumulative</span><span className="text-lg font-black font-mono text-[var(--theme-text)] transition-colors">Live Accumulation</span></div></div><div className="grid grid-cols-3 gap-2 transition-colors">{['5D', '20D', '60D'].map((d, i) => (<div key={i} className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 text-center shadow-inner transition-colors"><span className="text-[8px] text-slate-500 font-black block mb-1 transition-colors">{d}</span><span className={classNames("text-xs font-black font-mono transition-colors", (selectedInsight.deep?.multiWhale?.foreigner?.[`vol${d.toLowerCase()}`] || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>{(selectedInsight.deep?.multiWhale?.foreigner?.[`vol${d.toLowerCase()}`] || 0).toLocaleString()}</span></div>))}</div></div>
                                    <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-cyan-500/20 rounded-[2rem] p-6 space-y-4 group/i transition-colors shadow-md"><div className="flex items-center gap-4 transition-colors"><div className="w-12 h-12 rounded-2xl bg-cyan-600/20 flex items-center justify-center text-cyan-600 group-hover/i:bg-cyan-600 group-hover/i:text-white transition-all"><Activity size={24} /></div><div><span className="text-[10px] text-slate-500 font-black uppercase block transition-colors">Institution Cumulative</span><span className="text-lg font-black font-mono text-[var(--theme-text)] transition-colors">Live Accumulation</span></div></div><div className="grid grid-cols-3 gap-2 transition-colors">{['5D', '20D', '60D'].map((d, i) => (<div key={i} className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 text-center shadow-inner transition-colors"><span className="text-[8px] text-slate-500 font-black block mb-1 transition-colors">{d}</span><span className={classNames("text-xs font-black font-mono transition-colors", (selectedInsight.deep?.multiWhale?.institution?.[`vol${d.toLowerCase()}`] || 0) >= 0 ? "text-emerald-600" : "text-rose-600")}>{(selectedInsight.deep?.multiWhale?.institution?.[`vol${d.toLowerCase()}`] || 0).toLocaleString()}</span></div>))}</div></div>
                                </div>
                            </div>
                            <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-[2.5rem] p-8 space-y-6 transition-colors shadow-2xl">
                                <div className="flex items-center gap-3 transition-colors"><Newspaper size={24} className="text-indigo-600 transition-colors" /><h3 className="text-[var(--theme-text)] font-black text-lg uppercase tracking-widest transition-colors">분석 근거 및 요약 뉴스</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 transition-colors">
                                    {(selectedInsight.deep?.news || []).map((news, i) => (
                                        <div key={i} onClick={() => news.link && window.open(news.link, '_blank')} className={classNames("p-4 bg-[var(--theme-bg)] transition-colors duration-500/50 rounded-2xl border border-[var(--theme-border)] transition-colors duration-500 flex items-start gap-3 transition-all duration-300", news.link ? "cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 group/news" : "")}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0 group-hover/news:scale-125 transition-transform transition-colors"></div>
                                            <p className="text-[var(--theme-text)] text-[11px] font-black leading-relaxed transition-colors">{typeof news === 'string' ? news : news.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-8 border-t border-[var(--theme-border)] bg-[var(--theme-bg)] transition-colors duration-500 flex justify-end transition-colors shadow-inner">
                            <button onClick={() => setIsModalOpen(false)} className="px-14 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-[2rem] transition-all shadow-xl active:scale-95 transition-colors">지휘 확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyPortfolioDashboard;
