import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWatchlist, fetchStockPrice, fetchSpecialReport } from '../api/stockApi';
import { Repeat, Brain, TrendingUp, Sparkles } from 'lucide-react';
import classNames from 'classnames';
import { getSignSymbol, getColorClass, getMarketDisplay } from '../utils/stockUtils';

const WatchlistSummary = () => {
    const [displayStocks, setDisplayStocks] = useState([]);
    const [aiReport, setAiReport] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [globalMarketMode, setGlobalMarketMode] = useState('J');
    const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' or 'ai'
    const stockUpdatesBuffer = useRef(new Map());

    const renderFormattedText = (text) => {
        if (!text) return null;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        return lines.map((line, index) => {
            const isNumbered = /^\d+\./.test(line.trim());
            return (
                <div key={index} className={classNames("mb-2.5 last:mb-0 leading-relaxed", { "pl-1": !isNumbered })}>
                    {isNumbered ? (
                        <div className="flex gap-2">
                            <span className="text-indigo-400 font-black shrink-0 text-[13px]">{line.match(/^\d+\./)[0]}</span>
                            <span className="text-slate-200 font-semibold text-[13px]">{line.replace(/^\d+\./, '').trim()}</span>
                        </div>
                    ) : (
                        <span className="text-slate-300 text-[13px]">{line}</span>
                    )}
                </div>
            );
        });
    };

    useEffect(() => {
        const loadReport = async () => {
            try {
                const report = await fetchSpecialReport();
                setAiReport(report);
            } catch (e) {
                setAiReport("분석 리포트를 불러오지 못했습니다.");
            }
        };
        loadReport();
    }, []);

    const loadFavoriteStocks = useCallback(async (market) => {
        setIsLoading(true);
        try {
            // 모든 그룹의 관심종목을 가져와서 즐겨찾기(isFavorite)된 것만 필터링
            const allPromises = [1, 2, 3, 4].map(id => fetchWatchlist(id));
            const results = await Promise.all(allPromises);
            const allStocks = results.flat();
            const favorites = allStocks.filter(s => s.isFavorite);
            
            // 중복 제거 (종목코드 기준)
            const uniqueFavorites = Array.from(new Map(favorites.map(s => [s.stockCode, s])).values());

            if (uniqueFavorites.length > 0) {
                const stocksWithPrice = await Promise.all(
                    uniqueFavorites.map(async (w) => {
                        // [중요] 사용자가 선택한 시장(market)의 가격 정보를 요청
                        const priceData = await fetchStockPrice(w.stockCode, market);
                        return {
                            id: w.stockCode, 
                            name: w.stockName, 
                            code: w.stockCode, 
                            exchangeCode: market, // 현재 보고 있는 시장 코드로 설정
                            price: parseFloat(priceData?.currentPrice) || 0,
                            change: parseFloat(priceData?.change) || 0,
                            changeRate: parseFloat(priceData?.changeRate) || 0,
                            priceSign: priceData?.priceSign || '3',
                            volume: priceData?.volume || '-',
                        };
                    })
                );
                setDisplayStocks(stocksWithPrice);
            } else {
                setDisplayStocks([]);
            }
        } catch (e) { 
            console.error("WatchlistSummary Load Error:", e);
            setDisplayStocks([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadFavoriteStocks(globalMarketMode); }, [globalMarketMode, loadFavoriteStocks]);

    useEffect(() => {
        const eventSource = new EventSource('/stockPlus/api/sse/stocks');
        eventSource.addEventListener('priceUpdate', (e) => {
            try {
                let updates = JSON.parse(e.data);
                if (!Array.isArray(updates)) updates = [updates];
                updates.forEach(u => {
                    // 키 생성 시 시장 코드 포함 (J, NX, UN)
                    const key = `${u.stockCode}-${u.exchangeCode || 'J'}`;
                    stockUpdatesBuffer.current.set(key, u);
                });
            } catch (err) {}
        });
        const interval = setInterval(() => {
            if (stockUpdatesBuffer.current.size === 0) return;
            const updatesMap = new Map(stockUpdatesBuffer.current);
            stockUpdatesBuffer.current.clear();
            
            setDisplayStocks(prev => prev.map(s => {
                // 현재 종목의 시장 코드와 일치하는 업데이트 찾기
                let u = updatesMap.get(`${s.code}-${s.exchangeCode}`);
                
                // 만약 일치하는 게 없고 현재 보고 있는 시장이 UN(해외)인 경우, 
                // 혹시라도 J나 NX로 들어온 데이터가 있는지 확인 (종목코드가 같으면 업데이트 할 수도 있으나, 가격 차이가 크므로 주의)
                // 여기서는 정확히 시장 코드가 일치하는 경우만 업데이트하도록 엄격하게 처리함.
                
                return u ? { 
                    ...s, 
                    ...u, 
                    price: parseFloat(u.currentPrice), 
                    change: parseFloat(u.change), 
                    changeRate: parseFloat(u.changeRate) 
                } : s;
            }));
        }, 300);
        return () => { eventSource.close(); clearInterval(interval); };
    }, []);

    const marketInfo = getMarketDisplay(globalMarketMode);

    return (
        <div className="h-full bg-slate-950 flex flex-col items-center overflow-hidden custom-scrollbar">
            {/* Mobile Top Tabs (Visible only on mobile) */}
            <div className="w-full flex lg:hidden bg-slate-900 border-b border-slate-800 shrink-0">
                <button 
                    onClick={() => setActiveSubTab('list')}
                    className={classNames("flex-1 py-4 text-sm font-bold border-b-2 transition-all", {
                        "border-indigo-500 text-white bg-slate-800/50": activeSubTab === 'list',
                        "border-transparent text-slate-500": activeSubTab !== 'list'
                    })}
                >
                    관심종목시세
                </button>
                <button 
                    onClick={() => setActiveSubTab('ai')}
                    className={classNames("flex-1 py-4 text-sm font-bold border-b-2 transition-all", {
                        "border-indigo-500 text-white bg-slate-800/50": activeSubTab === 'ai',
                        "border-transparent text-slate-500": activeSubTab !== 'ai'
                    })}
                >
                    AI 분석
                </button>
            </div>

            <div className="w-full max-w-7xl flex-1 overflow-y-auto lg:overflow-hidden p-4 custom-scrollbar lg:grid lg:grid-cols-2 lg:gap-6">
                
                {/* 1. 관심종목 시세 */}
                <div className={classNames("flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden h-full", {
                    "flex": activeSubTab === 'list' || window.innerWidth >= 1024,
                    "hidden lg:flex": activeSubTab !== 'list'
                })}>
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-850 shrink-0">
                        <div>
                            <h1 className="text-xl font-black text-white mb-1 flex items-center gap-2"><TrendingUp className="text-indigo-500" size={24} /> 관심종목 시세</h1>
                            <p className="text-slate-500 text-xs font-medium">즐겨찾기 종목 실시간 모니터링</p>
                        </div>
                        <button 
                            onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))}
                            className={classNames("flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all", marketInfo.colorClass)}
                        >
                            <Repeat size={14} />
                            {marketInfo.name}
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {isLoading ? <div className="flex justify-center items-center h-40"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div> : displayStocks.length > 0 ? (
                            <div className="space-y-3">
                                {displayStocks.map(stock => (
                                    <div key={stock.code} className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-4 flex justify-between items-center active:bg-slate-800 transition-colors">
                                        <div><div className="text-base font-bold text-slate-100">{stock.name}</div><div className="text-[11px] text-slate-500 font-medium mt-0.5">{stock.code}</div></div>
                                        <div className="text-right">
                                            <div className={classNames("text-lg font-black tabular-nums tracking-tight", getColorClass(stock.priceSign))}>{stock.price.toLocaleString()}</div>
                                            <div className={classNames("text-xs font-bold mt-0.5", getColorClass(stock.priceSign))}>{getSignSymbol(stock.priceSign)} {Math.abs(stock.change).toLocaleString()} ({stock.changeRate.toFixed(2)}%)</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="flex flex-col items-center justify-center h-64 text-slate-600"><p className="text-sm">즐겨찾기된 종목이 없습니다.</p></div>}
                    </div>
                </div>

                {/* 2. 전담 AI 분석가 */}
                <div className={classNames("flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative h-full", {
                    "flex": activeSubTab === 'ai' || window.innerWidth >= 1024,
                    "hidden lg:flex": activeSubTab !== 'ai'
                })}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
                    <div className="p-5 border-b border-slate-800 bg-slate-850 flex items-center gap-3 relative z-10 shrink-0">
                        <div className="p-2 bg-indigo-500/10 rounded-lg"><Brain className="text-indigo-400" size={24} /></div>
                        <div><h2 className="text-xl font-black text-white">전담 AI 분석가</h2><p className="text-xs text-indigo-400 font-bold">매일 08:55 / 15:55 업데이트</p></div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative z-10">
                        <div className="whitespace-pre-wrap leading-relaxed">
                            {renderFormattedText(aiReport) || (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                                    <Sparkles size={40} className="mb-4 opacity-10 animate-pulse" />
                                    <p className="text-sm">리포트를 불러오는 중입니다...</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-10 pt-10 border-t border-slate-800/50 text-center">
                            <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">End of Strategic Report</p>
                        </div>
                    </div>
                    <div className="p-3 bg-slate-950 border-t border-slate-800 text-center relative z-10 shrink-0"><span className="text-[10px] text-slate-600 font-mono uppercase tracking-widest">Investment Strategy Briefing</span></div>
                </div>
            </div>
        </div>
    );
};

export default WatchlistSummary;