import React, { useState, useEffect } from 'react';
import { getAuthHeader } from '../api/stockApi';
import { Sparkles, Loader2, Calendar, TrendingUp, AlertCircle, Info, ArrowUpRight, BarChart3, Clock, LayoutDashboard, Search } from 'lucide-react';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';

const SmartMoneyDashboard = () => {
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'ADMIN') {
            navigate('/');
            return;
        }
        fetchSmartMoneyStocks();
    }, [navigate]);

    const fetchSmartMoneyStocks = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/stockPlus/api/admin/intelligence/smart-money', {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const json = await res.json();
                setStocks(json);
            }
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStocks = stocks.filter(s => {
        const search = searchTerm.toLowerCase().trim();
        if (!search) return true;
        return (
            (s.stock_name && s.stock_name.toLowerCase().includes(search)) || 
            (s.stock_code && s.stock_code.includes(search))
        );
    });

    return (
        <div className="flex-1 bg-slate-950 pt-4 px-4 lg:pt-8 lg:px-10 h-[100dvh] lg:h-full flex flex-col gap-6 overflow-hidden relative animate-in fade-in duration-500 pb-20 lg:pb-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
                        <Sparkles className="text-amber-400" size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl lg:text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                            Smart Money <span className="text-amber-500 not-italic font-sans">90%+</span>
                        </h1>
                        <p className="text-slate-500 text-[10px] lg:text-xs font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
                            <Clock size={12} className="text-slate-600" /> Recent 30 Days Hall of Fame
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="종목명 또는 코드 검색..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white text-xs lg:text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-amber-500/50 transition-all font-bold"
                        />
                    </div>
                    <button 
                        onClick={fetchSmartMoneyStocks}
                        className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95"
                    >
                        <TrendingUp size={20} />
                    </button>
                </div>
            </header>

            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl lg:rounded-3xl p-5 flex items-start gap-4 shadow-inner relative overflow-hidden shrink-0">
                <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12"><BarChart3 size={120} className="text-indigo-400" /></div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30"><Info className="text-indigo-400" size={22} /></div>
                <div className="relative z-10">
                    <h4 className="text-indigo-400 font-black text-[11px] lg:text-xs uppercase tracking-widest mb-1">스마트머니 박제 시스템 (30일 추적)</h4>
                    <p className="text-slate-300 text-xs lg:text-sm leading-relaxed font-medium">
                        최근 30일 이내에 **스마트머니 유입 점수(S-Score) 90점**을 돌파했던 특급 수급주들을 자동으로 모아둡니다. <br className="hidden lg:block" /> 
                        이 종목들은 거대 자금의 매집이 확인된 종목들로, 단기 눌림목 발생 시 강력한 반등 타점이 될 가능성이 매우 높습니다.
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar pr-1">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                        <Loader2 size={48} className="animate-spin text-amber-500 opacity-50" />
                        <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Scanning Smart Money...</p>
                    </div>
                ) : filteredStocks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-10">
                        {filteredStocks.map((stock, idx) => {
                            const lastDate = new Date(stock.last_detected);
                            const dateStr = `${lastDate.getMonth()+1}.${lastDate.getDate()}`;
                            const isNew = (new Date() - lastDate) < (24 * 60 * 60 * 1000);

                            return (
                                <div 
                                    key={stock.stock_code} 
                                    onClick={() => navigate(`/stock/${stock.stock_code}`)}
                                    className="group relative bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all cursor-pointer shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-white font-black text-lg group-hover:text-amber-400 transition-colors">{stock.stock_name}</span>
                                            <span className="text-slate-500 font-mono text-[11px] tracking-widest">{stock.stock_code}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Max S-Score</div>
                                            <div className="px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                                                <span className="text-amber-400 font-black text-base">{parseFloat(stock.max_score).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {stock.reason && stock.reason.split(',').slice(0, 3).map((r, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-black rounded border border-slate-700/50 uppercase truncate max-w-[100px]">
                                                    {r.trim()}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between relative">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={12} className="text-slate-600" />
                                                <span className="text-[10px] font-bold text-slate-500">포착일: {dateStr}</span>
                                                {isNew && (
                                                    <span className="bg-rose-600 text-white text-[8px] font-black px-1 py-0.5 rounded shadow-sm border border-rose-500/50 leading-none">
                                                        NEW
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 text-amber-500 font-black text-[10px] opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                DETAILS <ArrowUpRight size={12} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent w-full opacity-0 group-hover:opacity-100 transition-all"></div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-6 py-32 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                        <AlertCircle size={64} className="text-slate-800" />
                        <div className="text-center">
                            <p className="text-slate-500 text-sm font-black uppercase tracking-widest mb-2">No Smart Money Stocks Found</p>
                            <p className="text-slate-600 text-xs font-bold italic">최근 30일 이내에 90점을 돌파한 종목이 아직 없습니다.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartMoneyDashboard;
