import React, { useState, useEffect } from 'react';
import { getAuthHeader } from '../api/stockApi';
import { Calendar, Download, TrendingUp, Loader2, Award, X, Brain, CheckCircle2, AlertCircle, BarChart3, Activity, ArrowUpRight, ArrowDownRight, HelpCircle, Info } from 'lucide-react';
import classNames from 'classnames';

const NextLeaderDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [nextLeaders, setNextLeaders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('ranking'); 
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false); // 도움말 모달 상태

    const [reviewData, setReviewData] = useState({ modelPerformance: [], pastRecommendations: [] });

    const fetchNextLeaders = async (date) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/stockPlus/api/admin/intelligence/next-leaders?date=${date}`, {
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

    const fetchReviewData = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/stockPlus/api/admin/intelligence/ai-review`, {
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
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const d = new Date(dateStr);
                const pad = (n) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };
            const excelData = nextLeaders.map((item, idx) => ({
                "순위": idx + 1,
                "종목명": item.stock_name,
                "종목코드": item.stock_code,
                "총점": parseFloat(item.total_score.toFixed(1)),
                "알고리즘(Q)": parseFloat(item.algo_score.toFixed(1)),
                "LSTM(L)": parseFloat((item.lstm_score || 0).toFixed(1)),
                "TCN(T)": parseFloat((item.tcn_score || 0).toFixed(1)),
                "XGB(X)": parseFloat((item.xgb_score || 0).toFixed(1)),
                "선발사유": item.reason,
                "분석시간": formatDate(item.captured_at)
            }));
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 50 }, { wch: 20 }];
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "NextLeaders");
            XLSX.writeFile(workbook, `StockPlus_NextLeaders_${selectedDate.replace(/-/g, '')}.xlsx`);
        };
        document.head.appendChild(script);
    };

    const renderRankingTab = () => (
        <div id="next-leader-ranking-area" className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800 rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm flex flex-col mx-0.5 lg:mx-0 animate-in fade-in duration-500">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-white text-xs lg:text-base font-black flex items-center gap-1.5 uppercase tracking-tighter">
                        <TrendingUp className="text-rose-500" size={16} /> 바닥 탈출 Top 20
                    </h3>
                    <button 
                        onClick={() => setIsHelpModalOpen(true)}
                        className="text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                        <HelpCircle size={16} />
                    </button>
                </div>
                <span className="text-[9px] text-slate-500 font-mono italic">1,600 Stocks Analysis</span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 z-10 bg-slate-900 shadow-sm">
                        <tr>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900">Rank</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 w-32 lg:w-40">Stock</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-slate-900">Total</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900">Score Breakdown (Q / L / T / X)</th>
                            <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[180px] bg-slate-900">Reason</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {isLoading ? (
                            <tr><td colSpan="5" className="py-20 text-center"><Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-slate-500 text-[10px] font-bold uppercase animate-pulse">Analyzing...</p></td></tr>
                        ) : nextLeaders.length > 0 ? (
                            <>{nextLeaders.map((item, idx) => (
                                <tr key={item.id} className="group hover:bg-indigo-600/5 transition-colors">
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2">
                                        <div className={classNames(
                                            "w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center font-black text-xs lg:text-sm shadow-inner",
                                            idx < 3 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                                        )}>{idx + 1}</div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2 w-32 lg:w-40">
                                        <div className="flex flex-col"><span className="text-white font-black text-sm lg:text-base group-hover:text-indigo-400 transition-colors truncate">{item.stock_name}</span><span className="text-slate-500 font-mono text-[10px]">{item.stock_code}</span></div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2 text-center">
                                        <div className="inline-block px-3 py-1 bg-slate-800 rounded-full border border-slate-700"><span className="text-indigo-400 font-black text-sm lg:text-base">{item.total_score.toFixed(1)}</span></div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col gap-0.5 w-10 lg:w-14">
                                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>Q</span><span>{item.algo_score.toFixed(0)}</span></div>
                                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{width: `${item.algo_score}%`}}></div></div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 w-10 lg:w-14">
                                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>L</span><span>{(item.lstm_score || 0).toFixed(0)}</span></div>
                                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${item.lstm_score || 0}%`}}></div></div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 w-10 lg:w-14">
                                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>T</span><span>{(item.tcn_score || 0).toFixed(0)}</span></div>
                                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-pink-500" style={{width: `${item.tcn_score || 0}%`}}></div></div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 w-10 lg:w-14">
                                                <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase"><span>X</span><span>{(item.xgb_score || 0).toFixed(0)}</span></div>
                                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-cyan-500" style={{width: `${item.xgb_score || 0}%`}}></div></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 lg:px-6 py-1.5 lg:py-2">
                                        <div className="flex flex-wrap gap-1">
                                            {item.reason.split(',').map((r, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] lg:text-[11px] font-bold rounded border border-slate-700/50">{r.trim()}</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}<tr className="h-4"><td></td></tr></>
                        ) : (
                            <tr><td colSpan="5" className="py-20 text-center text-slate-600 font-bold italic text-xs uppercase tracking-widest">No Data Available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderReviewTab = () => (
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 lg:gap-6 animate-in slide-in-from-bottom-4 duration-500 pb-10 px-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {reviewData.modelPerformance.length > 0 ? reviewData.modelPerformance.map((m, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                        <div className={classNames("absolute top-0 left-0 w-1 h-full", 
                            m.model_name === 'LSTM' ? 'bg-indigo-500' : (m.model_name === 'TCN' ? 'bg-rose-500' : 'bg-cyan-500')
                        )}></div>
                        <div className="flex justify-between items-start mb-4">
                            <div><h4 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{m.model_name} Model</h4><p className={classNames("text-xl font-black", 
                                m.model_name === 'LSTM' ? 'text-indigo-400' : (m.model_name === 'TCN' ? 'text-rose-400' : 'text-cyan-400')
                            )}>{m.hit_rate}% <span className="text-[10px] text-slate-600 ml-1">HIT</span></p></div>
                            <div className="text-right"><span className="text-[9px] text-slate-500 font-bold block mb-1 uppercase">Weight</span><span className="text-sm font-black text-white">{m.weight}%</span></div>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={classNames("h-full transition-all duration-1000", 
                            m.model_name === 'LSTM' ? 'bg-indigo-500' : (m.model_name === 'TCN' ? 'bg-rose-500' : 'bg-cyan-500')
                        )} style={{ width: `${m.hit_rate}%` }}></div></div>
                    </div>
                )) : [1,2,3].map(i => <div key={i} className="h-24 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse"></div>)}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-5 lg:p-8 shadow-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-white font-black flex items-center gap-2 uppercase tracking-tighter"><CheckCircle2 className="text-emerald-500" size={20} /> AI 사후 복기 리포트</h3>
                    <span className="text-[10px] text-slate-500 font-mono italic">Past 10 Validated Results</span>
                </div>
                
                <div className="space-y-3">
                    {reviewData.pastRecommendations.length > 0 ? reviewData.pastRecommendations.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="text-[10px] font-black text-slate-500 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">{item.date}</div>
                                <div><div className="text-sm font-bold text-white">{item.stock_name}</div><div className="text-[9px] text-indigo-400 font-mono">Score: {item.total_score.toFixed(1)}</div></div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-right hidden sm:block"><div className="text-[9px] text-slate-500 uppercase font-bold">Price Change</div><div className="text-xs text-white font-black">{item.price_at_recom.toLocaleString()} → {item.price_after_3d.toLocaleString()}</div></div>
                                <div className="text-right w-20">
                                    <div className={classNames("text-sm font-black flex items-center justify-end gap-1", item.hit_result === 'SUCCESS' ? 'text-rose-400' : 'text-blue-400')}>
                                        {item.hit_result === 'SUCCESS' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        {item.price_at_recom > 0 ? (((item.price_after_3d - item.price_at_recom) / item.price_at_recom) * 100).toFixed(1) : '0.0'}%
                                    </div>
                                    <div className={classNames("text-[9px] font-bold uppercase", item.hit_result === 'SUCCESS' ? 'text-emerald-500' : 'text-slate-500')}>{item.hit_result}</div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="p-10 flex flex-col items-center text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center"><Activity className="text-indigo-400 animate-pulse" size={24} /></div>
                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">데이터 분석 및 검증 중...</h4>
                                <p className="text-slate-400 text-[11px] leading-relaxed">최초 분석 후 3일이 경과한 종목부터 순차적으로 성적표가 공개됩니다.<br/>수요일 아침부터 실제 복기 데이터가 노출될 예정입니다.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6 flex items-start gap-4">
                <Brain className="text-indigo-400 shrink-0 mt-1" size={24} />
                <div>
                    <h4 className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-2">AI Performance Insight</h4>
                    <p className="text-slate-300 text-[12px] leading-relaxed font-medium">
                        {reviewData.modelPerformance.length > 0 
                            ? `현재 ${reviewData.modelPerformance.reduce((prev, curr) => prev.hit_rate > curr.hit_rate ? prev : curr).model_name} 모델이 가장 높은 적중률을 보이고 있습니다. 시장의 흐름에 따라 매주 주말 가중치(Weight)가 자동 최적화되어 다음 주 분석에 반영됩니다.`
                            : "시계열 데이터가 축적됨에 따라 AI 모델별 강점과 약점을 스스로 분석하여 인사이트를 제공합니다. 현재는 초기 학습 데이터를 수집하는 단계입니다."}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex-1 bg-slate-950 pt-2 px-1 lg:pt-6 lg:px-6 h-[100dvh] lg:h-full flex flex-col gap-2 lg:gap-4 overflow-hidden relative pb-27 lg:pb-5">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 px-1">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 lg:p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
                        <Award className="text-indigo-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-base lg:text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-1.5">
                            Next Leaders <span className="text-indigo-500 not-italic font-sans">AI</span>
                        </h1>
                        <p className="text-slate-500 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest mt-0.5">Daily Turn-around Briefing</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 w-full lg:w-auto pr-1">
                    <div className="relative w-[130px] lg:w-[160px] shrink-0">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                            className="w-full bg-slate-900 border border-slate-700 text-white text-[11px] lg:text-sm rounded-xl pl-8 pr-1 py-1.5 lg:py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer font-bold tracking-tighter" 
                        />
                    </div>
                    <button 
                        onClick={downloadExcel} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 lg:py-2.5 rounded-xl font-black text-[10px] lg:text-sm flex items-center gap-1 shadow-lg transition-all shrink-0"
                    >
                        <Download size={14} /> EXCEL
                    </button>
                </div>
            </header>

            <div className="flex justify-end lg:mt-[-8px] shrink-0">
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-full lg:w-fit shadow-lg">
                    <button onClick={() => setActiveTab('ranking')} className={classNames("flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-2", activeTab === 'ranking' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}><TrendingUp size={12} /> RANKING</button>
                    <button onClick={() => setActiveTab('review')} className={classNames("flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-2", activeTab === 'review' ? "bg-rose-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}><Brain size={12} /> AI REVIEW</button>
                </div>
            </div>

            {activeTab === 'ranking' ? renderRankingTab() : renderReviewTab()}

            {/* AI Breakdown 도움말 모달 */}
            {isHelpModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsHelpModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-800 bg-slate-850 flex justify-between items-center text-white">
                            <h3 className="text-lg font-black uppercase italic flex items-center gap-2"><Info className="text-indigo-400" size={20} /> AI Breakdown Guide</h3>
                            <button onClick={() => setIsHelpModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 font-black text-rose-400">Q</div>
                                <div><h4 className="text-white font-bold text-sm mb-1 uppercase">Algorithm (Q-Score)</h4><p className="text-slate-400 text-xs leading-relaxed">RSI 과매도 탈출, 이동평균선 수렴, 거래량 스파이크 등 4가지 핵심 기술적 지표를 결합한 수학적 바닥 탐지 엔진입니다.</p></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 font-black text-indigo-400">L</div>
                                <div><h4 className="text-white font-bold text-sm mb-1 uppercase">LSTM (Trend Analysis)</h4><p className="text-slate-400 text-xs leading-relaxed">딥러닝 모델이 지난 5일간의 수급 맥락을 분석합니다. 서서히 매집이 이루어지는 '건강한 상승 추세'를 잡아내는 마법사입니다.</p></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center shrink-0 font-black text-pink-400">T</div>
                                <div><h4 className="text-white font-bold text-sm mb-1 uppercase">TCN (Volatility Hunt)</h4><p className="text-slate-400 text-xs leading-relaxed">순간적인 거래량 폭발과 미세한 패턴 변화를 포착하는 수색대입니다. 바닥에서 갑자기 머리를 드는 급격한 에너지 변화에 민감합니다.</p></div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 font-black text-cyan-400">X</div>
                                <div><h4 className="text-white font-bold text-sm mb-1 uppercase">XGBoost (Statistical Verdict)</h4><p className="text-slate-400 text-xs leading-relaxed">과거 수만 개의 성공/실패 사례를 학습한 냉철한 통계학자입니다. 모든 지표를 종합하여 현재 시장에서의 '성공 확률'을 최종 판정합니다.</p></div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-850 border-t border-slate-800">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 mb-4">
                                <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Activity size={14} /> Total Score Formula
                                </h4>
                                <p className="text-white text-sm font-bold tracking-tight">
                                    Total = (Q × 0.6) + (AI Ensemble × 0.4)
                                </p>
                                <p className="text-slate-500 text-[10px] mt-1 leading-relaxed">
                                    AI 앙상블은 LSTM(20%), TCN(20%), XGBoost(60%)의 비중으로 결합되어 최종 지능형 점수를 도출합니다.
                                </p>
                            </div>
                            <button onClick={() => setIsHelpModalOpen(false)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">이해했습니다</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NextLeaderDashboard;
