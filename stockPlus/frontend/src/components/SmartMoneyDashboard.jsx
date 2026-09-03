import React, { useState, useEffect } from 'react';
import { getAuthHeader } from '../api/stockApi';
import { Sparkles, Loader2, Calendar, TrendingUp, AlertCircle, Info, ArrowUpRight, BarChart3, Clock, LayoutDashboard, Search, ShieldAlert, Target, Users, Zap, CheckCircle2 } from 'lucide-react';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';

const SmartMoneyDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('stealth'); // 'stealth' (세력 잠행 매집) | 'hallOfFame' (90%+ 명예의 전당)
    const [stocks, setStocks] = useState([]);
    const [stealthStocks, setStealthStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'ADMIN') {
            navigate('/');
            return;
        }
        fetchAllData();
    }, [navigate]);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchSmartMoneyStocks(),
                fetchStealthStocks()
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSmartMoneyStocks = async () => {
        try {
            const res = await fetch('/api/admin/intelligence/smart-money', {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const json = await res.json();
                setStocks(json);
            }
        } catch (e) {
            console.error("Fetch Smart Money Error:", e);
        }
    };

    const fetchStealthStocks = async () => {
        try {
            const res = await fetch('/api/admin/intelligence/stealth-accumulation', {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const json = await res.json();
                setStealthStocks(json);
            }
        } catch (e) {
            console.error("Fetch Stealth Stocks Error:", e);
        }
    };

    const currentList = activeTab === 'stealth' ? stealthStocks : stocks;

    const filteredStocks = currentList.filter(s => {
        const search = searchTerm.toLowerCase().trim();
        if (!search) return true;
        return (
            (s.stock_name && s.stock_name.toLowerCase().includes(search)) || 
            (s.stock_code && s.stock_code.includes(search))
        );
    });

    return (
        <div className="flex-1 bg-[var(--theme-bg)] transition-colors duration-500 pt-4 px-4 lg:pt-8 lg:px-10 h-[100dvh] lg:h-full flex flex-col gap-6 overflow-hidden relative animate-in fade-in duration-500 pb-20 lg:pb-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className={classNames(
                        "p-3 rounded-2xl border shadow-lg transition-all",
                        activeTab === 'stealth' 
                            ? "bg-indigo-500/20 border-indigo-500/30 shadow-indigo-500/10" 
                            : "bg-amber-500/20 border-amber-500/30 shadow-amber-500/10"
                    )}>
                        {activeTab === 'stealth' ? (
                            <Target className="text-indigo-400" size={28} />
                        ) : (
                            <Sparkles className="text-amber-400" size={28} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl lg:text-3xl font-black text-[var(--theme-text)] tracking-tight uppercase italic flex items-center gap-2 transition-colors">
                            Smart Money <span className={activeTab === 'stealth' ? "text-indigo-500 not-italic font-sans" : "text-amber-600 not-italic font-sans"}>
                                {activeTab === 'stealth' ? 'Stealth Accumulation' : '90%+ Hall of Fame'}
                            </span>
                        </h1>
                        <p className="text-slate-500 text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5 transition-colors">
                            <Clock size={12} className="text-slate-600" />
                            {activeTab === 'stealth' ? 'Recent 7 Days Big Hands Positioning' : 'Recent 30 Days Hall of Fame'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto transition-colors">
                    {/* 서브 탭 스위처 */}
                    <div className="flex items-center bg-[var(--theme-header)] p-1 rounded-xl border border-[var(--theme-border)] w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('stealth')}
                            className={classNames(
                                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                activeTab === 'stealth'
                                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                    : "text-slate-400 hover:text-[var(--theme-text)]"
                            )}
                        >
                            <Target size={14} /> 세력 잠행 매집 ({stealthStocks.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('hallOfFame')}
                            className={classNames(
                                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                activeTab === 'hallOfFame'
                                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                                    : "text-slate-400 hover:text-[var(--theme-text)]"
                            )}
                        >
                            <Sparkles size={14} /> 90%+ 명예의 전당 ({stocks.length})
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-56 transition-colors">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors" size={16} />
                            <input 
                                type="text" 
                                placeholder="종목명 또는 코드..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] text-[var(--theme-text)] text-xs lg:text-sm rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500/50 transition-all font-black placeholder:text-slate-600 shadow-sm"
                            />
                        </div>
                        <button 
                            onClick={fetchAllData}
                            className="p-2 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] text-slate-400 hover:text-white rounded-xl transition-all active:scale-95"
                            title="새로고침"
                        >
                            <TrendingUp size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* 안내 배너 */}
            {activeTab === 'stealth' ? (
                <div className="bg-gradient-to-r from-indigo-950/40 via-indigo-900/20 to-transparent border border-indigo-500/30 rounded-2xl lg:rounded-3xl p-5 flex items-start gap-4 shadow-inner relative overflow-hidden shrink-0">
                    <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12"><Target size={120} className="text-indigo-400" /></div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-md"><Zap className="text-indigo-400" size={22} /></div>
                    <div className="relative z-10 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-indigo-400 font-black text-[11px] lg:text-xs uppercase tracking-widest">세력 잠행 매집 레이더 (Stealth Accumulation)</h4>
                            <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-indigo-500/30">실전 선취매 타점</span>
                        </div>
                        <p className="text-[var(--theme-text)] opacity-85 text-xs lg:text-sm leading-relaxed font-black transition-colors">
                            최근 7거래일 동안 **외국인 및 기관이 주가를 띄우지 않고 조용히 쓸어 담은 누적 매집주**를 역추적합니다. <br className="hidden lg:block transition-colors" />
                            큰손의 <span className="text-emerald-400 underline underline-offset-4">추정 평단가와 현재가의 괴리율</span>을 비교하여, 세력 평단가 부근이거나 마이너스(역괴리)인 안전한 눌림목 구간을 선별하세요.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl lg:rounded-3xl p-5 flex items-start gap-4 shadow-inner relative overflow-hidden shrink-0">
                    <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12"><BarChart3 size={120} className="text-amber-400" /></div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30"><Info className="text-amber-400" size={22} /></div>
                    <div className="relative z-10 transition-colors">
                        <h4 className="text-amber-600 font-black text-[11px] lg:text-xs uppercase tracking-widest mb-1 transition-colors">스마트머니 박제 시스템 (30일 추적)</h4>
                        <p className="text-[var(--theme-text)] opacity-80 text-xs lg:text-sm leading-relaxed font-black transition-colors">
                            최근 30일 이내에 **스마트머니 유입 점수(S-Score) 90점**을 돌파했던 특급 수급주들을 자동으로 모아둡니다. <br className="hidden lg:block transition-colors" /> 
                            이 종목들은 거대 자금의 매집이 확인된 종목들로, 단기 눌림목 발생 시 강력한 반등 타점이 될 가능성이 매우 높습니다.
                        </p>
                    </div>
                </div>
            )}

            {/* 메인 리스트 뷰 */}
            <div className="flex-1 overflow-auto custom-scrollbar pr-1">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                        <Loader2 size={48} className="animate-spin text-indigo-500 opacity-50" />
                        <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Scanning Accumulation & Smart Money...</p>
                    </div>
                ) : filteredStocks.length > 0 ? (
                    activeTab === 'stealth' ? (
                        /* 세력 잠행 매집 카드 그리드 */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-10">
                            {filteredStocks.map((stock, idx) => {
                                const diffRate = parseFloat(stock.diff_rate || 0);
                                const isSafeEntry = diffRate <= 2.0; // 세력 평단 대비 2% 이내이거나 마이너스면 안전 진입권
                                const totalBuyQty = (stock.total_smart_buy || 0).toLocaleString();
                                const estPrice = (stock.est_avg_price || 0).toLocaleString();
                                const currentPrice = (Math.round(stock.current_price || 0)).toLocaleString();

                                return (
                                    <div 
                                        key={stock.stock_code} 
                                        onClick={() => navigate(`/stock/${stock.stock_code}`)}
                                        className="group relative bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-2xl p-5 hover:border-indigo-500/50 transition-all cursor-pointer shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[var(--theme-text)] font-black text-lg group-hover:text-indigo-400 transition-colors">{stock.stock_name}</span>
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                        {stock.main_actor}
                                                    </span>
                                                </div>
                                                <span className="text-slate-500 font-mono text-[11px] font-black tracking-widest">{stock.stock_code}</span>
                                            </div>
                                            
                                            {/* 괴리율 배지 */}
                                            <div className="flex flex-col items-end">
                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">세력평단 괴리율</div>
                                                <div className={classNames(
                                                    "px-2.5 py-1 rounded-full border text-xs font-black flex items-center gap-1",
                                                    diffRate <= 0 
                                                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" 
                                                        : diffRate <= 3 
                                                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                                                            : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                                )}>
                                                    {diffRate > 0 ? `+${diffRate}%` : `${diffRate}%`}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 수급 통계 2x2 그리드 */}
                                        <div className="grid grid-cols-2 gap-2 p-3 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)]/60 my-3 text-xs">
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-bold block">추정 세력 평단</span>
                                                <span className="text-indigo-300 font-black">{estPrice}원</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-bold block">현재가</span>
                                                <span className="text-[var(--theme-text)] font-black">{currentPrice}원</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-bold block">외인 순매수</span>
                                                <span className={classNames("font-bold text-[11px]", (stock.foreign_buy || 0) >= 0 ? "text-red-400" : "text-blue-400")}>
                                                    {(stock.foreign_buy || 0) > 0 ? `+${(stock.foreign_buy || 0).toLocaleString()}` : (stock.foreign_buy || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-500 font-bold block">기관 순매수</span>
                                                <span className={classNames("font-bold text-[11px]", (stock.inst_buy || 0) >= 0 ? "text-red-400" : "text-blue-400")}>
                                                    {(stock.inst_buy || 0) > 0 ? `+${(stock.inst_buy || 0).toLocaleString()}` : (stock.inst_buy || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-[var(--theme-border)] flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                {isSafeEntry ? (
                                                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                                                        <CheckCircle2 size={12} /> 세력 평단가 이하 (매수 유효)
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        누적 매집: <strong className="text-indigo-400">{totalBuyQty}</strong>주
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 text-indigo-400 font-black text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                차트 분석 <ArrowUpRight size={12} />
                                            </div>
                                        </div>

                                        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent w-full opacity-0 group-hover:opacity-100 transition-all"></div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* 기존 90%+ 명예의 전당 카드 그리드 */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-10">
                            {filteredStocks.map((stock, idx) => {
                                const lastDate = new Date(stock.last_detected);
                                const dateStr = `${lastDate.getMonth()+1}.${lastDate.getDate()}`;
                                const isNew = (new Date() - lastDate) < (24 * 60 * 60 * 1000);

                                return (
                                    <div 
                                        key={stock.stock_code} 
                                        onClick={() => navigate(`/stock/${stock.stock_code}`)}
                                        className="group relative bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-2xl p-5 hover:border-amber-500/40 transition-all cursor-pointer shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-[var(--theme-text)] font-black text-lg group-hover:text-amber-600 transition-colors">{stock.stock_name}</span>
                                                <span className="text-slate-500 font-mono text-[11px] font-black tracking-widest">{stock.stock_code}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Max S-Score</div>
                                                <div className="px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                                                    <span className="text-amber-600 font-black text-base">{parseFloat(stock.max_score).toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-1.5">
                                                {stock.reason && stock.reason.split(',').slice(0, 3).map((r, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-[var(--theme-bg)] text-slate-500 text-[9px] font-black rounded border border-[var(--theme-border)] uppercase truncate max-w-[100px] shadow-sm">
                                                        {r.trim()}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="pt-3 border-t border-[var(--theme-border)] flex items-center justify-between relative">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} className="text-slate-500" />
                                                    <span className="text-[10px] font-black text-slate-500">포착일: {dateStr}</span>
                                                    {isNew && (
                                                        <span className="bg-rose-600 text-white text-[8px] font-black px-1 py-0.5 rounded shadow-sm border border-rose-500/50 leading-none animate-pulse">
                                                            NEW
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 text-amber-600 font-black text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                    DETAILS <ArrowUpRight size={12} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent w-full opacity-0 group-hover:opacity-100 transition-all"></div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-6 py-32 bg-[var(--theme-header)] transition-colors duration-500/20 rounded-3xl border border-dashed border-[var(--theme-border)]">
                        <AlertCircle size={64} className="text-slate-500 opacity-20" />
                        <div className="text-center">
                            <p className="text-[var(--theme-text)] opacity-60 text-sm font-black uppercase tracking-widest mb-2">No Stocks Found</p>
                            <p className="text-slate-500 text-xs font-bold italic">
                                {activeTab === 'stealth' ? '현재 조건에 부합하는 세력 잠행 매집 종목이 없습니다.' : '최근 30일 이내에 90점을 돌파한 종목이 아직 없습니다.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartMoneyDashboard;

