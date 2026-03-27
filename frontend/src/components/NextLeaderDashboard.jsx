import React, { useState, useEffect } from 'react';
import { getAuthHeader } from '../api/stockApi';
import { Calendar, Download, TrendingUp, Loader2, Award, X, Brain, CheckCircle2, AlertCircle, BarChart3, Activity, ArrowUpRight, ArrowDownRight, HelpCircle, Info, ThumbsUp, Ghost, Package, CloudRain, ThumbsDown, Sparkles } from 'lucide-react';
import classNames from 'classnames';

import { useNavigate } from 'react-router-dom';

const NextLeaderDashboard = () => {
    const navigate = useNavigate();

    // [v36.60] Zero-Trust UI Security: ADMIN 권한 확인 및 미승인 시 즉시 퇴출
    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'ADMIN') {
            console.error(">>> [SECURITY ALERT] Unauthorized access attempt to Next Leaders Dashboard.");
            alert("관리자 전용 영역입니다. 접근 권한이 없습니다.");
            navigate('/');
        }
    }, [navigate]);

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [nextLeaders, setNextLeaders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ranking'); 
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false); 
    const [isFeedbackHelpOpen, setIsFeedbackHelpOpen] = useState(false); 
    const [isReasonHelpOpen, setIsReasonHelpOpen] = useState(false); 

    const [reviewData, setReviewData] = useState({ modelPerformance: [], pastRecommendations: [] });

    const fetchNextLeaders = async (date) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/intelligence/next-leaders?date=${date}`, {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const json = await res.json();
                setNextLeaders(json);
            }
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeedback = async (stockCode, feedbackTag) => {
        try {
            setNextLeaders(prev => prev.map(item => 
                item.stock_code === stockCode ? { ...item, feedback_tag: feedbackTag } : item
            ));

            const res = await fetch(`/api/admin/intelligence/next-leaders/feedback`, {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ stockCode, date: selectedDate, feedbackTag })
            });
            
            if (!res.ok) {
                fetchNextLeaders(selectedDate);
            }
        } catch (e) {
            console.error("Feedback Error:", e);
        }
    };

    const fetchReviewData = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/intelligence/ai-review`, {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const json = await res.json();
                setReviewData(json);
            }
        } catch (e) {
            console.error("Review Data Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'ranking') {
            fetchNextLeaders(selectedDate);
        } else {
            fetchReviewData();
        }
    }, [selectedDate, activeTab]);

    const downloadExcel = () => {
        if (nextLeaders.length === 0) return;
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
        script.onload = () => {
            const XLSX = window.XLSX;
            const excelData = nextLeaders.map((item, idx) => ({
                "순위": idx + 1,
                "종목명": item.stock_name,
                "종목코드": item.stock_code,
                "총점": parseFloat(item.total_score.toFixed(1)),
                "복기태그": item.feedback_tag || "",
                "선발사유": item.reason
            }));
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "NextLeaders");
            XLSX.writeFile(workbook, `StockPlus_NextLeaders_${selectedDate}.xlsx`);
        };
        document.head.appendChild(script);
    };

    const renderRankingTab = () => (
        <div id="next-leader-ranking-area" className="flex-1 min-h-0 bg-[var(--theme-header)] transition-colors duration-500/50 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm flex flex-col mx-0.5 lg:mx-0 animate-in fade-in duration-500">
            <div className="p-3 border-b border-[var(--theme-border)] transition-colors duration-500 flex items-center justify-between bg-[var(--theme-header)] transition-colors duration-500/80 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-[var(--theme-text)] text-xs lg:text-base font-black flex items-center gap-1.5 uppercase tracking-tighter transition-colors">
                        <TrendingUp className="text-rose-500" size={16} /> 바닥 탈출 Top 10
                    </h3>
                    <button onClick={() => setIsHelpModalOpen(true)} className="text-slate-500 hover:text-indigo-400 transition-colors"><HelpCircle size={16} /></button>
                </div>
                <span className="text-[9px] text-slate-500 font-mono italic">Daily Top 10 Elite Analysis</span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="sticky top-0 z-10 bg-[var(--theme-header)] transition-colors duration-500 shadow-sm">
                        <tr>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-[var(--theme-header)] transition-colors duration-500">Rank</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-[var(--theme-header)] transition-colors duration-500 w-32 lg:w-40">Stock</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-[var(--theme-header)] transition-colors duration-500">Total</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-[var(--theme-header)] transition-colors duration-500">Score Breakdown (Q / L / T / X / S)</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-[var(--theme-header)] transition-colors duration-500 min-w-[380px] lg:min-w-[550px]">
                                <div className="flex items-center gap-1">
                                    Reason
                                    <button onClick={() => setIsReasonHelpOpen(true)} className="text-slate-600 hover:text-indigo-400 transition-colors"><HelpCircle size={12} /></button>
                                </div>
                            </th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-[var(--theme-header)] transition-colors duration-500 min-w-[250px] lg:min-w-[280px]">
                                <div className="flex items-center justify-center gap-1.5">
                                    AI Feedback (Review)
                                    <button onClick={() => setIsFeedbackHelpOpen(true)} className="text-slate-600 hover:text-indigo-400 transition-colors"><HelpCircle size={14} /></button>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {isLoading ? (
                            <tr><td colSpan="6" className="py-20 text-center"><Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-slate-500 text-[10px] font-bold uppercase animate-pulse">Analyzing...</p></td></tr>
                        ) : nextLeaders.length > 0 ? (
                            nextLeaders.map((item, idx) => (
                                <tr key={item.id} className="group hover:bg-indigo-600/5 transition-colors">
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2"><div className={classNames("w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center font-black text-xs lg:text-sm shadow-inner", idx < 3 ? "bg-indigo-600 text-white" : "bg-[var(--theme-bg)] text-slate-500 border border-[var(--theme-border)] transition-colors")}>{idx + 1}</div></td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2 w-32 lg:w-40"><div className="flex flex-col transition-colors"><span className="text-[var(--theme-text)] font-black text-sm lg:text-base group-hover:text-indigo-400 transition-colors truncate">{item.stock_name}</span><span className="text-slate-500 font-mono text-[10px] font-black">{item.stock_code}</span></div></td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2 text-center"><div className="inline-block px-3 py-1 bg-[var(--theme-bg)] rounded-full border border-[var(--theme-border)] transition-colors"><span className="text-indigo-600 font-black text-sm lg:text-base transition-colors">{item.total_score.toFixed(1)}</span></div></td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2">
                                        <div className="flex items-center gap-3">
                                            {[ 
                                                { label: 'Q', score: item.algo_score, color: 'bg-rose-500' },
                                                { label: 'L', score: item.lstm_score, color: 'bg-indigo-500' },
                                                { label: 'T', score: item.tcn_score, color: 'bg-pink-500' },
                                                { label: 'X', score: item.xgb_score, color: 'bg-cyan-500' },
                                                { label: 'S', score: item.smart_money_score, color: 'bg-orange-500' }
                                            ].map((m, i) => (
                                                <div key={i} className="flex flex-col gap-0.5 w-10 lg:w-14">
                                                    <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>{m.label}</span><span>{(m.score || 0).toFixed(0)}</span></div>
                                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className={classNames("h-full", m.color)} style={{width: `${m.score || 0}%`}}></div></div>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2 min-w-[380px] lg:min-w-[550px]">
                                        <div className="flex flex-wrap gap-1 transition-colors">
                                            {item.reason.split(',').map((r, i) => {
                                                const txt = r.trim();
                                                const isHot = txt.includes('★') || txt.includes('오판');
                                                const isGood = txt.includes('고수익') || txt.includes('고성장');
                                                const isSupply = txt.includes('수급포착');
                                                const isNoise = txt.includes('노이즈');
                                                
                                                return (
                                                    <span key={i} className={classNames(
                                                        "px-2 py-1 text-[9px] lg:text-[10px] font-black rounded-md border transition-all uppercase tracking-wider shadow-sm transition-colors",
                                                        isHot ? "bg-rose-500/20 text-rose-500 border-rose-500/40 shadow-rose-900/20" :
                                                        isGood ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/40 shadow-emerald-900/20" :
                                                        isSupply ? "bg-violet-600/20 text-violet-400 border-violet-500/40 shadow-violet-900/20" :
                                                        isNoise ? "bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-blue-900/20" :
                                                        "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                                    )}>
                                                        {txt}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2 min-w-[250px] lg:min-w-[280px]">
                                        <div className="flex items-center justify-center gap-1 transition-colors">
                                            {['성공', '매집', '실패', '노이즈', '시황'].map(tag => {
                                                const icons = { '성공': <ThumbsUp size={8} />, '매집': <Package size={8} />, '실패': <ThumbsDown size={8} />, '노이즈': <Ghost size={8} />, '시황': <CloudRain size={8} /> };
                                                const colors = { '성공': 'emerald', '매집': 'indigo', '실패': 'rose', '노이즈': 'slate', '시황': 'amber' };
                                                const c = colors[tag];
                                                const active = item.feedback_tag === tag;
                                                return (
                                                    <button key={tag} onClick={() => handleFeedback(item.stock_code, tag)} className={classNames("px-2 py-1 rounded-lg text-[8px] font-black transition-all flex items-center gap-1 border transition-colors", active ? `bg-${c}-600 text-white border-${c}-500 shadow-lg` : `bg-[var(--theme-header)] text-slate-500 border-[var(--theme-border)] hover:text-${c}-600 shadow-sm`)}>{icons[tag]} {tag}</button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="6" className="py-20 text-center text-slate-600 font-bold italic text-xs uppercase tracking-widest">No Data Available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderReviewTab = () => (
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 lg:gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-10 px-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {reviewData.modelPerformance.map((m, i) => {
                    const color = m.model_name === 'LSTM' ? '#6366f1' : (m.model_name === 'TCN' ? '#f43f5e' : '#06b6d4');
                    const textColor = m.model_name === 'LSTM' ? 'text-indigo-600' : (m.model_name === 'TCN' ? 'text-rose-600' : 'text-cyan-600');
                    const radius = 32;
                    const circumference = 2 * Math.PI * radius;

                    return (
                        <div key={i} className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-3xl p-6 shadow-xl flex flex-col items-center gap-6 group hover:border-indigo-500/30 transition-all">
                            <div className="flex justify-center w-full items-center">
                                <h4 className="text-[var(--theme-text)] font-black text-sm lg:text-base uppercase tracking-[0.2em] flex items-center gap-2 transition-colors">
                                    <Brain size={18} style={{ color }} /> {m.model_name} Engine
                                </h4>
                            </div>
                            
                            <div className="flex items-center justify-around w-full gap-4">
                                <div className="relative flex items-center justify-center flex-col gap-2">
                                    <div className="relative flex items-center justify-center">
                                        <svg className="w-40 h-40 lg:w-48 lg:h-48 transform -rotate-90">
                                            <circle cx="50%" cy="50%" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-200/50 transition-colors" />
                                            <circle cx="50%" cy="50%" r="70" stroke={color} strokeWidth="14" fill="transparent" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={(2 * Math.PI * 70) - (m.hit_rate / 100) * (2 * Math.PI * 70)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                        </svg>
                                        <span className={classNames("absolute text-2xl lg:text-4xl font-black font-mono tracking-tighter transition-colors", textColor)}>{m.hit_rate}%</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest transition-colors">Hit Rate</span>
                                </div>
                                <div className="h-12 w-px bg-[var(--theme-border)] transition-colors"></div>
                                <div className="relative flex items-center justify-center flex-col gap-2">
                                    <div className="relative flex items-center justify-center">
                                        <svg className="w-40 h-40 lg:w-48 lg:h-48 transform -rotate-90">
                                            <circle cx="50%" cy="50%" r="70" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-slate-200/50 transition-colors" />
                                            <circle cx="50%" cy="50%" r="70" stroke={color} strokeWidth="14" fill="transparent" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={(2 * Math.PI * 70) - (m.weight / 100) * (2 * Math.PI * 70)} strokeLinecap="round" className="transition-all duration-1000 ease-out" opacity="0.6" />
                                        </svg>
                                        <span className="absolute text-2xl lg:text-4xl font-black font-mono text-[var(--theme-text)] opacity-40 tracking-tighter transition-colors">{m.weight}%</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest transition-colors">Weight</span>
                                </div>
                            </div>

                            <div className="w-full pt-4 border-t border-[var(--theme-border)] transition-colors duration-500/50 flex flex-col items-center gap-1">
                                <p className={classNames("text-[10px] font-black uppercase tracking-widest text-center transition-colors", m.hit_rate >= 70 ? "text-emerald-600" : (m.hit_rate >= 50 ? "text-indigo-600" : "text-amber-600"))}>
                                    {m.hit_rate >= 70 ? "High Reliability" : (m.hit_rate >= 50 ? "Stable Performance" : "Calibration Required")}
                                </p>
                                <span className="text-[10px] text-slate-500 font-mono italic text-center transition-colors">Real-time Influence Monitor</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {reviewData.modelPerformance?.length > 0 && reviewData.modelPerformance[0].tuning_reason && (
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl lg:rounded-3xl p-6 lg:p-8 flex items-start gap-5 shadow-inner animate-in fade-in slide-in-from-top-4 duration-700 transition-colors">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 transition-colors">
                        <Sparkles className="text-indigo-600" size={28} />
                    </div>
                    <div>
                        <h4 className="text-indigo-600 font-black text-xs lg:text-sm uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors">
                            AI Model Tuning Strategy <span className="text-[11px] text-slate-500 font-normal normal-case italic transition-colors">(Sunday 21:00 Updated)</span>
                        </h4>
                        <p className="text-[var(--theme-text)] text-sm lg:text-base leading-relaxed font-black transition-colors">
                            {reviewData.modelPerformance[0].tuning_reason}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl lg:rounded-3xl p-5 lg:p-8 shadow-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[var(--theme-border)] transition-colors duration-500 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <CheckCircle2 className="text-emerald-500" size={22} />
                        </div>
                        <div>
                            <h3 className="text-[var(--theme-text)] font-black text-lg uppercase tracking-tighter transition-colors">AI 사후 복기 리포트</h3>
                            <p className="text-[10px] text-slate-500 font-mono italic transition-colors">Past 10 Validated Results</p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-black text-slate-500 uppercase block">Verification Window</span>
                        <span className="text-xs text-indigo-400 font-bold">T+2 Trading Days</span>
                    </div>
                </div>
                
                <div className="space-y-3">
                    {reviewData.pastRecommendations.length > 0 ? reviewData.pastRecommendations.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-[var(--theme-bg)] transition-colors duration-500/50 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 hover:border-indigo-500/30 transition-all group shadow-inner">
                            <div className="flex items-center gap-4">
                                <div className="text-[10px] font-black text-slate-500 bg-[var(--theme-header)] transition-colors duration-500 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] transition-colors duration-500 shadow-sm group-hover:text-indigo-400 transition-colors">{item.date}</div>
                                <div>
                                    <div className="text-sm lg:text-base font-black text-[var(--theme-text)] mb-0.5 transition-colors">{item.stock_name}</div>
                                    <div className="flex items-center gap-2 transition-colors">
                                        <span className="text-[9px] text-[var(--theme-point)] font-black font-mono px-1.5 py-0.5 bg-[var(--theme-point)]/10 rounded border border-[var(--theme-point)]/20 uppercase transition-colors">Final Score: {item.total_score.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 lg:gap-10">
                                <div className="text-right hidden md:block transition-colors">
                                    <div className="text-[9px] text-slate-500 uppercase font-black mb-1 transition-colors">Price Trajectory</div>
                                    <div className="text-xs text-[var(--theme-text)] font-black flex items-center gap-2 bg-[var(--theme-header)] transition-colors duration-500 px-2 py-1 rounded-lg border border-[var(--theme-border)] transition-colors duration-500 shadow-sm">
                                        <span>{item.price_at_recom.toLocaleString()}</span>
                                        <ArrowUpRight size={12} className="text-slate-400" />
                                        <span>{item.price_after_3d.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="text-right w-24">
                                    <div className={classNames("text-base lg:text-xl font-black flex items-center justify-end gap-1 tracking-tighter", 
                                        item.hit_result === 'SUCCESS' ? 'text-rose-400' : 'text-blue-400'
                                    )}>
                                        {item.hit_result === 'SUCCESS' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                        {item.price_at_recom > 0 ? (((item.price_after_3d - item.price_at_recom) / item.price_at_recom) * 100).toFixed(1) : '0.0'}%
                                    </div>
                                    <div className={classNames("text-[10px] font-black uppercase px-2 py-0.5 rounded inline-block mt-1", 
                                        item.hit_result === 'SUCCESS' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    )}>{item.hit_result}</div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 flex flex-col items-center text-center gap-4">
                            <Activity className="text-slate-700 animate-pulse" size={48} />
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Collecting Validation Data...</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl lg:rounded-3xl p-6 lg:p-8 flex items-start gap-5 shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                    <Brain className="text-indigo-400" size={28} />
                </div>
                <div>
                    <h4 className="text-indigo-600 font-black text-xs lg:text-sm uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors">
                        AI Performance Insight <Sparkles size={14} className="animate-pulse" />
                    </h4>
                    <p className="text-[var(--theme-text)] text-[13px] lg:text-sm leading-relaxed font-bold transition-colors">
                        {reviewData.modelPerformance.length > 0 
                            ? `현재 ${reviewData.modelPerformance.reduce((prev, curr) => prev.hit_rate > curr.hit_rate ? prev : curr).model_name} 모델이 가장 높은 적중률을 보이고 있습니다. 시장의 흐름에 따라 매주 주말 가중치(Weight)가 자동 최적화되어 다음 주 분석에 반영됩니다.`
                            : "시계열 데이터가 축적됨에 따라 AI 모델별 강점과 약점을 스스로 분석하여 인사이트를 제공합니다. 현재는 초기 학습 데이터를 수집하는 단계입니다."}
                    </p>
                </div>
            </div>
        </div>
    );

    const renderReasonHelp = () => (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsReasonHelpOpen(false)}></div>
            <div className="relative w-full max-w-lg bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 transition-colors">
                    <h3 className="text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><Brain className="text-indigo-600" size={20} /> AI 분석 키워드 가이드</h3>
                    <button onClick={() => setIsReasonHelpOpen(false)} className="p-1.5 bg-[var(--theme-bg)] rounded-full text-slate-500 hover:text-[var(--theme-text)] transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar-thin pr-2 transition-colors">
                    <section className="transition-colors">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 transition-colors">📊 기술적 분석 (퀀트 & 국면)</h4>
                        <div className="grid grid-cols-1 gap-2 transition-colors">
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-emerald-500/30 flex justify-between items-center shadow-lg shadow-emerald-500/5 transition-colors">
                                <span className="text-xs font-black text-emerald-600">RSI바닥탈출</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">RSI 35 이하 침체권에서 반등 시작 (가산점 +20)</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-blue-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-blue-600">과매도진입</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">RSI 30 이하 역사적 저점 도달 (가산점 +10)</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex justify-between items-center">
                                <span className="text-xs font-black text-[var(--theme-text)] transition-colors">이평선수렴</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">5일/20일선 간격 2% 이내 밀착 (에너지 응축)</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex justify-between items-center">
                                <span className="text-xs font-black text-[var(--theme-text)] transition-colors">추세안정</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">RSI 35~55 구간의 건강한 상승 초입</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-[var(--theme-text)] transition-colors">골든크로스</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">5일선이 20일선을 상향 돌파 (추세 전환)</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-[var(--theme-text)] transition-colors">거래량폭발</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">직전 대비 거래량 2.5배 이상 급증</span>
                            </div>
                        </div>
                    </section>
                    <section className="transition-colors">
                        <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 px-1 transition-colors">🔥 스마트머니 (수급 등급)</h4>
                        <div className="grid grid-cols-1 gap-2 transition-colors">
                            <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-orange-600">🔥메가스마트머니</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">100억 유입 또는 비중 15% 돌파 (S급)</span>
                            </div>
                            <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-orange-600">스마트수급폭발</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">50억 유입 또는 비중 10% 돌파 (A급)</span>
                            </div>
                            <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-orange-600">스마트머니유입</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">20억 유입 또는 비중 5% 돌파 (B급)</span>
                            </div>
                            <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-orange-600">수급강화</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">전일 대비 프로그램 순매수세가 강화된 국면</span>
                            </div>
                        </div>
                    </section>
                    <section className="transition-colors">
                        <h4 className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-2 px-1 transition-colors">⚔️ 공매도 & 숏스퀴즈</h4>
                        <div className="grid grid-cols-1 gap-2 transition-colors">
                            <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-cyan-600">숏스퀴즈임박</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">현재가가 공매도 평단가 상향 돌파</span>
                            </div>
                            <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-cyan-600">공매도항복</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">공매도 공격 중단 및 숏커버링 감지</span>
                            </div>
                            <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-cyan-600">고농축공매도</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">누적 공매도 비중 10% 이상의 폭발 대기주</span>
                            </div>
                        </div>
                    </section>
                    <section className="transition-colors">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 transition-colors">💰 실적 분석 (펀더멘털)</h4>
                        <div className="grid grid-cols-1 gap-2 transition-colors">
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-emerald-500/10 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-emerald-600 transition-colors">고수익</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">영업이익률 10% 초과 우량 실적 기업</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-emerald-500/10 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-emerald-600 transition-colors">고성장</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">ROE 15% 초과 초고속 성장 기업</span>
                            </div>
                        </div>
                    </section>
                    <section className="transition-colors">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 transition-colors">🧠 인적 직관 (피드백)</h4>
                        <div className="grid grid-cols-1 gap-2 transition-colors">
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-rose-500/10 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-rose-600">★직관강화</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">사용자 피드백(성공/매집) 반영 가점</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-slate-500 transition-colors">★시황반영</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">개별 호재보다 시장 전체 흐름 반영</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-blue-500/10 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-blue-600 transition-colors">⚠노이즈제외</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">가짜 수급 및 허수 물량 필터링 감점</span>
                            </div>
                            <div className="bg-[var(--theme-bg)] transition-colors duration-500/50 p-3 rounded-xl border border-rose-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-rose-600 transition-colors">✖오판주의</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">사용자 피드백(실패)에 따른 강력 경고</span>
                            </div>
                        </div>
                    </section>
                    <section className="transition-colors">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 px-1 transition-colors">🌊 수급 에너지 (OBV)</h4>
                        <div className="bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 flex justify-between items-center transition-colors">
                            <span className="text-xs font-black text-indigo-600">수급포착</span>
                            <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">OBV 지표 기반 세력의 매집 에너지 포착</span>
                        </div>
                    </section>
                    <section className="transition-colors">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1 transition-colors">⚠️ 과열 및 리스크 (RSI)</h4>
                        <div className="grid grid-cols-1 gap-2 transition-colors">
                            <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-rose-600">⚠️심각과열</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">RSI 75 이상 단기 급등 (점수 -30% 삭감)</span>
                            </div>
                            <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-orange-600">⚠️고점경계</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">RSI 65~75 구간 진입 (점수 -15% 삭감)</span>
                            </div>
                            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-amber-600">⚠️추세주의</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">RSI 60~65 구간 진입 (점수 -8% 삭감)</span>
                            </div>
                            <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 flex justify-between items-center transition-colors">
                                <span className="text-xs font-black text-yellow-600">⚠️과열진입</span>
                                <span className="text-[10px] text-[var(--theme-text)] opacity-70 text-right font-bold transition-colors">RSI 55~60 구간 진입 (점수 -5% 삭감)</span>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 bg-[var(--theme-bg)] transition-colors duration-500 pt-2 px-1 lg:pt-6 lg:px-6 h-[100dvh] lg:h-full flex flex-col gap-2 lg:gap-4 overflow-hidden relative pb-27 lg:pb-5 font-sans">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 px-1 transition-colors">
                <div className="flex items-center gap-3 transition-colors">
                    <div className="p-1.5 lg:p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30 transition-colors"><Award className="text-[var(--theme-point)]" size={20} /></div>
                    <div><h1 className="text-base lg:text-2xl font-black text-[var(--theme-text)] tracking-tight uppercase italic flex items-center gap-1.5 transition-colors">Next Leaders <span className="text-[var(--theme-point)] not-italic font-sans">AI</span></h1><p className="text-slate-500 text-[9px] lg:text-[10px] font-black uppercase tracking-widest mt-0.5 transition-colors">Daily Turn-around Briefing</p></div>
                </div>
                <div className="flex items-center justify-end gap-2 w-full lg:w-auto pr-1 transition-colors">
                    <div className="relative w-[130px] lg:w-[160px] shrink-0 transition-colors"><Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} /><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] text-[var(--theme-text)] text-[11px] lg:text-sm rounded-xl pl-8 pr-1 py-1.5 lg:py-2.5 focus:ring-2 focus:ring-[var(--theme-point)]/50 outline-none cursor-pointer font-black tracking-tighter" /></div>
                    <button onClick={downloadExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 lg:py-2.5 rounded-xl font-black text-[10px] lg:text-sm flex items-center gap-1 shadow-lg shrink-0 transition-colors active:scale-95"><Download size={14} /> EXCEL</button>
                </div>
            </header>

            <div className="flex justify-end lg:mt-[-8px] shrink-0 transition-colors">
                <div className="flex bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 p-1 rounded-xl w-full lg:w-fit shadow-xl transition-colors">
                    <button onClick={() => setActiveTab('ranking')} className={classNames("flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-2 transition-colors", activeTab === 'ranking' ? "bg-[var(--theme-point)] text-white shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 hover:text-[var(--theme-text)]")}><TrendingUp size={12} /> RANKING</button>
                    <button onClick={() => setActiveTab('review')} className={classNames("flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-2 transition-colors", activeTab === 'review' ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-slate-500 hover:text-[var(--theme-text)]")}><Brain size={12} /> AI REVIEW</button>
                </div>
            </div>

            {activeTab === 'ranking' ? renderRankingTab() : renderReviewTab()}

            {isHelpModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsHelpModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-[var(--theme-header)] transition-colors duration-500 border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] flex justify-between items-center text-[var(--theme-text)]"><h3 className="text-lg font-black uppercase italic flex items-center gap-2 transition-colors"><Info className="text-[var(--theme-point)]" size={20} /> AI Breakdown Guide</h3><button onClick={() => setIsHelpModalOpen(false)} className="p-2 hover:bg-[var(--theme-bg)] rounded-full transition-colors"><X size={20}/></button></div>
                        <div className="p-8 space-y-6">
                            <div className="flex gap-4 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 font-black text-rose-600 transition-colors">Q</div>
                                <div className="transition-colors"><h4 className="text-[var(--theme-text)] font-black text-sm mb-1 uppercase transition-colors">Algorithm (Q-Score)</h4><p className="text-slate-500 text-xs font-bold leading-relaxed transition-colors">RSI 과매도 탈출, 이동평균선 수렴, 거래량 스파이크 등 4가지 핵심 기술적 지표를 결합한 수학적 바닥 탐지 엔진입니다.</p></div>
                            </div>
                            <div className="flex gap-4 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 font-black text-indigo-600 transition-colors">L</div>
                                <div className="transition-colors"><h4 className="text-[var(--theme-text)] font-black text-sm mb-1 uppercase transition-colors">LSTM (Trend Analysis)</h4><p className="text-slate-500 text-xs font-bold leading-relaxed transition-colors">딥러닝 모델이 지난 5일간의 수급 맥락을 분석합니다. 서서히 매집이 이루어지는 '건강한 상승 추세'를 잡아내는 마법사입니다.</p></div>
                            </div>
                            <div className="flex gap-4 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0 font-black text-pink-600 transition-colors">T</div>
                                <div className="transition-colors"><h4 className="text-[var(--theme-text)] font-black text-sm mb-1 uppercase transition-colors">TCN (Volatility Hunt)</h4><p className="text-slate-500 text-xs font-bold leading-relaxed transition-colors">순간적인 거래량 폭발과 미세한 패턴 변화를 포착하는 수색대입니다. 바닥에서 갑자기 머리를 드는 급격한 에너지 변화에 민감합니다.</p></div>
                            </div>
                            <div className="flex gap-4 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 font-black text-cyan-600 transition-colors">X</div>
                                <div className="transition-colors"><h4 className="text-[var(--theme-text)] font-black text-sm mb-1 uppercase transition-colors">XGBoost (Statistical Verdict)</h4><p className="text-slate-500 text-xs font-bold leading-relaxed transition-colors">과거 수만 개의 성공/실패 사례를 학습한 냉철한 통계학자입니다. 모든 지표를 종합하여 현재 시장에서의 '성공 확률' 최종 판정.</p></div>
                            </div>
                            <div className="flex gap-4 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 font-black text-orange-600 transition-colors">S</div>
                                <div className="transition-colors"><h4 className="text-[var(--theme-text)] font-black text-sm mb-1 uppercase transition-colors">Smart Money (S-Power)</h4><p className="text-slate-500 text-xs font-bold leading-relaxed transition-colors">프로그램 매집 강도와 공매도 세력의 항복(숏스퀴즈) 에너지를 정밀 측정합니다. 세력이 대놓고 개입한 종목을 찾아내는 특급 엔진입니다.</p></div>
                            </div>
                        </div>
                        <div className="p-6 bg-[var(--theme-bg)] border-t border-[var(--theme-border)] transition-colors duration-500">
                            <div className="bg-[var(--theme-point)]/10 border border-[var(--theme-point)]/20 rounded-2xl p-4 mb-4 text-left transition-colors">
                                <h4 className="text-[var(--theme-point)] font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors">
                                    <Activity size={14} /> 균형분석 Total Score Formula (데이터 수집에서 변경 가능)
                                </h4>
                                <p className="text-[var(--theme-text)] text-sm font-black tracking-tight transition-colors">
                                    Total = (Q × 0.6) + (AI Ensemble × 0.4)
                                </p>
                                <p className="text-slate-500 text-[10px] mt-1 font-bold leading-relaxed transition-colors">
                                    AI 앙상블은 LSTM(20%), TCN(20%), XGBoost(60%)의 비중으로 결합되어 최종 지능형 점수를 도출합니다.
                                </p>
                            </div>
                            <button onClick={() => setIsHelpModalOpen(false)} className="w-full py-3 bg-[var(--theme-point)] text-white font-black rounded-xl hover:bg-[var(--theme-point)]/80 transition-all shadow-lg shadow-[var(--theme-point)]/20 active:scale-95 transition-colors">이해했습니다</button>
                        </div>
                    </div>
                </div>
            )}

            {isFeedbackHelpOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFeedbackHelpOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-[var(--theme-header)] transition-colors duration-500 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] flex justify-between items-center text-[var(--theme-text)]"><h3 className="text-lg font-black uppercase italic flex items-center gap-2 transition-colors"><Brain className="text-rose-600" size={20} /> AI Feedback Guide</h3><button onClick={() => setIsFeedbackHelpOpen(false)} className="p-2 hover:bg-[var(--theme-bg)] rounded-full transition-colors"><X size={20}/></button></div>
                        <div className="p-8 space-y-5 transition-colors">
                            {[ 
                                { icon: <ThumbsUp className="text-emerald-600" />, title: '성공 / 매집', desc: '상승 적중 또는 매집 포착. 차기 분석 시 가산점(+5) 부여.' },
                                { icon: <ThumbsDown className="text-rose-600" />, title: '실패', desc: '의도와 다르게 하락. 차기 분석 시 강력 감점(-15) 및 오답 학습.' },
                                { icon: <Ghost className="text-slate-500" />, title: '노이즈', desc: '가짜 신호. 차기 분석 시 감점(-10) 처리.' },
                                { icon: <CloudRain className="text-amber-600" />, title: '시황', desc: '외부 변수(전쟁 등) 영향. AI 재학습 데이터에서 제외.' }
                            ].map((m, i) => (
                                <div key={i} className="flex gap-4 transition-colors"><div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center shrink-0 shadow-sm">{m.icon}</div><div><h4 className="text-[var(--theme-text)] font-black text-sm mb-1 transition-colors">{m.title}</h4><p className="text-slate-500 text-xs font-bold leading-relaxed transition-colors">{m.desc}</p></div></div>
                            ))}
                        </div>
                        <div className="p-6 bg-[var(--theme-bg)] border-t border-[var(--theme-border)] transition-colors duration-500"><button onClick={() => setIsFeedbackHelpOpen(false)} className="w-full py-3 bg-rose-600 text-white font-black rounded-xl shadow-lg active:scale-95 transition-colors">확인 완료</button></div>
                    </div>
                </div>
            )}
            {isReasonHelpOpen && renderReasonHelp()}
        </div>
    );
};

export default NextLeaderDashboard;
