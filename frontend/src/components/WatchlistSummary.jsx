import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWatchlist, fetchStockPrice, fetchSpecialReport, fetchHoldings, addTrade, fetchTradeHistory, deleteTradeHistory } from '../api/stockApi';
import { Repeat, Brain, TrendingUp, Sparkles, ArrowLeft, Plus, Calculator, Wallet, History, Calendar, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import classNames from 'classnames';
import { getSignSymbol, getColorClass, getMarketDisplay } from '../utils/stockUtils';

const WatchlistSummary = () => {
    const [displayStocks, setDisplayStocks] = useState([]); 
    const [holdings, setHoldings] = useState([]); 
    const [aiReport, setAiReport] = useState(''); 
    const [isLoading, setIsLoading] = useState(true);
    const [globalMarketMode, setGlobalMarketMode] = useState('UN'); 
    const [activeSubTab, setActiveSubTab] = useState('list'); 
    
    const [selectedStock, setSelectedStock] = useState(null); 
    const [tradeHistory, setTradeHistory] = useState([]); 
    const [isTradeFormOpen, setIsTradeFormOpen] = useState(false); 
    const [tradeFormData, setTradeFormData] = useState({
        tradeDate: new Date().toISOString().split('T')[0], 
        price: '',
        quantity: ''
    });

    const stockUpdatesBuffer = useRef(new Map()); 

    const loadHoldings = useCallback(async () => {
        try {
            const data = await fetchHoldings();
            setHoldings(data);
        } catch (e) {
            console.error("Failed to load holdings", e);
        }
    }, []);

    const loadTradeHistory = useCallback(async (code) => {
        try {
            const data = await fetchTradeHistory(code);
            setTradeHistory(data);
        } catch (e) {
            console.error("Failed to load trade history", e);
        }
    }, []);

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
        loadHoldings();
    }, [loadHoldings]);

    const loadFavoriteStocks = useCallback(async (market) => {
        setIsLoading(true);
        try {
            const allPromises = [1, 2, 3, 4].map(id => fetchWatchlist(id));
            const results = await Promise.all(allPromises);
            const favorites = results.flat().filter(s => s.isFavorite);
            const uniqueFavorites = Array.from(new Map(favorites.map(s => [s.stockCode, s])).values());

            if (uniqueFavorites.length > 0) {
                const stocksWithPrice = await Promise.all(
                    uniqueFavorites.map(async (w) => {
                        const priceData = await fetchStockPrice(w.stockCode, market);
                        return {
                            id: w.stockCode, name: w.stockName, code: w.stockCode, exchangeCode: market,
                            price: parseFloat(priceData?.currentPrice) || 0,
                            change: parseFloat(priceData?.change) || 0,
                            changeRate: parseFloat(priceData?.changeRate) || 0,
                            priceSign: priceData?.priceSign || '3',
                        };
                    })
                );
                setDisplayStocks(stocksWithPrice);
            } else { setDisplayStocks([]); }
        } catch (e) { setDisplayStocks([]); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { loadFavoriteStocks(globalMarketMode); }, [globalMarketMode, loadFavoriteStocks]);

    useEffect(() => {
        const eventSource = new EventSource('/stockPlus/api/sse/stocks');
        eventSource.addEventListener('priceUpdate', (e) => {
            try {
                let updates = JSON.parse(e.data);
                if (!Array.isArray(updates)) updates = [updates];
                updates.forEach(u => {
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
                let u = updatesMap.get(`${s.code}-${s.exchangeCode}`);
                if (!u && s.exchangeCode === 'UN') { u = updatesMap.get(`${s.code}-J`) || updatesMap.get(`${s.code}-NX`); }
                
                if (selectedStock && selectedStock.code === s.code && u) {
                    setSelectedStock(prevSelected => ({
                        ...prevSelected, ...u,
                        price: parseFloat(u.currentPrice), change: parseFloat(u.change), changeRate: parseFloat(u.changeRate)
                    }));
                }
                return u ? { ...s, ...u, price: parseFloat(u.currentPrice), change: parseFloat(u.change), changeRate: parseFloat(u.changeRate) } : s;
            }));
        }, 300);
        return () => { eventSource.close(); clearInterval(interval); };
    }, [selectedStock]);

    const summary = (() => {
        let totalInvested = 0, totalEvaluation = 0; 
        holdings.forEach(h => {
            const currentStock = displayStocks.find(s => s.code === h.stockCode);
            const currentPrice = currentStock ? currentStock.price : (h.avgPrice || 0);
            totalInvested += h.quantity * h.avgPrice;
            totalEvaluation += h.quantity * currentPrice;
        });
        const totalProfit = totalEvaluation - totalInvested;
        const returnRate = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
        return { totalInvested, totalEvaluation, totalProfit, returnRate };
    })();

    const handleStockClick = (stock) => {
        const holdingInfo = holdings.find(h => h.stockCode === stock.code);
        setSelectedStock({ ...stock, holding: holdingInfo });
        loadTradeHistory(stock.code); 
        setTradeFormData({ tradeDate: new Date().toISOString().split('T')[0], price: stock.price || '', quantity: '' });
        setIsTradeFormOpen(false);
    };

    const handleAddTrade = async () => {
        if (!tradeFormData.quantity || !tradeFormData.price) return alert("수량과 단가를 입력해주세요.");
        try {
            await addTrade({
                stockCode: selectedStock.code, stockName: selectedStock.name,
                quantity: parseInt(tradeFormData.quantity), price: parseFloat(tradeFormData.price),
                tradeDate: tradeFormData.tradeDate 
            });
            setIsTradeFormOpen(false);
            await refreshDetailData();
        } catch (e) { alert("저장에 실패했습니다."); }
    };

    const handleDeleteTrade = async (id) => {
        if (!window.confirm("내역을 삭제하시겠습니까?")) return;
        try {
            await deleteTradeHistory(id);
            await refreshDetailData();
        } catch (e) { alert("삭제에 실패했습니다."); }
    };

    const refreshDetailData = async () => {
        await loadHoldings(); 
        await loadTradeHistory(selectedStock.code);
        const allHoldings = await fetchHoldings();
        const updatedHolding = allHoldings.find(h => h.stockCode === selectedStock.code);
        setSelectedStock(prev => ({ ...prev, holding: updatedHolding }));
    };

    const marketInfo = getMarketDisplay(globalMarketMode);

    const renderDetailView = () => {
        const holding = selectedStock.holding || { quantity: 0, avgPrice: 0 };
        const profit = (selectedStock.price - holding.avgPrice) * holding.quantity;
        const profitRate = holding.avgPrice > 0 ? ((selectedStock.price - holding.avgPrice) / holding.avgPrice) * 100 : 0;

        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-850 shrink-0">
                    <button onClick={() => setSelectedStock(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><ArrowLeft size={20} /></button>
                    <div><h2 className="text-base font-bold text-white leading-tight">{selectedStock.name}</h2><p className="text-[10px] text-slate-500 font-mono">{selectedStock.code}</p></div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                    <div className="p-5 text-center bg-gradient-to-b from-slate-800/20 to-transparent border-b border-slate-800/30">
                        <div className={classNames("text-3xl font-black tracking-tight mb-0.5", getColorClass(selectedStock.priceSign))}>{selectedStock.price?.toLocaleString()}</div>
                        <div className={classNames("text-xs font-bold flex justify-center gap-1 items-center", getColorClass(selectedStock.priceSign))}>
                            <span>{getSignSymbol(selectedStock.priceSign)}</span>
                            <span>{Math.abs(selectedStock.change).toLocaleString()}</span>
                            <span>({selectedStock.changeRate?.toFixed(2)}%)</span>
                        </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-3">
                        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/20"><p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">보유수량</p><p className="text-sm font-bold text-white">{holding.quantity}주</p></div>
                        <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/20"><p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">평균단가</p><p className="text-sm font-bold text-white">{holding.avgPrice?.toLocaleString()}원</p></div>
                        <div className="bg-slate-800/40 p-3 rounded-xl col-span-2 flex justify-between items-center border border-slate-700/20">
                            <div><p className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase">평가손익</p><p className={classNames("text-base font-black", profit >= 0 ? 'text-red-400' : 'text-blue-400')}>{profit > 0 ? '+' : ''}{profit.toLocaleString()}원</p></div>
                            <div className={classNames("text-xs font-black px-2 py-1 rounded bg-slate-950 border border-slate-800", profitRate >= 0 ? 'text-red-400' : 'text-blue-400')}>{profitRate.toFixed(2)}%</div>
                        </div>
                    </div>

                    <div className="px-4 pb-4">
                        <div className="flex items-center gap-2 mb-3 mt-2"><History size={14} className="text-indigo-400" /><h3 className="text-xs font-bold text-slate-300 uppercase tracking-tight">매매 히스토리</h3></div>
                        {tradeHistory.length > 0 ? (
                            <div className="space-y-2">
                                {tradeHistory.map((item) => (
                                    <div key={item.id} className="bg-slate-800/20 border border-slate-800/50 rounded-lg p-2.5 flex justify-between items-center group">
                                        <div className="flex items-center gap-2.5"><div className="bg-slate-800 p-1.5 rounded-md"><Calendar size={12} className="text-slate-500" /></div><div><p className="text-[11px] font-bold text-slate-300">{item.tradeDate}</p><p className="text-[10px] text-slate-500">{item.quantity}주 · {item.price.toLocaleString()}원</p></div></div>
                                        <div className="flex items-center gap-2"><div className="text-right"><p className="text-[11px] font-bold text-white">{(item.quantity * item.price).toLocaleString()}원</p><span className="text-[8px] text-indigo-400 font-bold">매수</span></div><button onClick={() => handleDeleteTrade(item.id)} className="p-1.5 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button></div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl"><p className="text-[10px] text-slate-600 font-medium">기록된 내역이 없습니다.</p></div>}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 backdrop-blur-md">
                    {!isTradeFormOpen ? (
                        <button onClick={() => setIsTradeFormOpen(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex justify-center items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10"><Plus size={18} /> 매매내역 추가</button>
                    ) : (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="col-span-2"><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">매수일자</label><input type="date" value={tradeFormData.tradeDate} onChange={e => setTradeFormData({...tradeFormData, tradeDate: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"/></div>
                                <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">단가</label><input type="number" value={tradeFormData.price} onChange={e => setTradeFormData({...tradeFormData, price: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"/></div>
                                <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">수량</label><input type="number" value={tradeFormData.quantity} onChange={e => setTradeFormData({...tradeFormData, quantity: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"/></div>
                            </div>
                            <div className="flex gap-2"><button onClick={() => setIsTradeFormOpen(false)} className="flex-1 py-2 bg-slate-700 text-slate-300 font-bold rounded-lg text-xs">취소</button><button onClick={handleAddTrade} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs">저장</button></div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full bg-slate-950 flex flex-col items-center overflow-hidden">
            <div className="w-full flex lg:hidden bg-slate-900 border-b border-slate-800 shrink-0">
                <button onClick={() => setActiveSubTab('list')} className={classNames("flex-1 py-4 text-sm font-bold border-b-2 transition-all", { "border-indigo-500 text-white bg-slate-800/50": activeSubTab === 'list', "border-transparent text-slate-500": activeSubTab !== 'list' })}>관심종목</button>
                <button onClick={() => setActiveSubTab('ai')} className={classNames("flex-1 py-4 text-sm font-bold border-b-2 transition-all", { "border-indigo-500 text-white bg-slate-800/50": activeSubTab === 'ai', "border-transparent text-slate-500": activeSubTab !== 'ai' })}>AI 분석</button>
            </div>

            <div className="w-full max-w-7xl flex-1 overflow-hidden p-4 lg:grid lg:grid-cols-2 lg:gap-6">
                <div className={classNames("flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden h-full relative", {
                    "flex": activeSubTab === 'list' || window.innerWidth >= 1024, "hidden lg:flex": activeSubTab !== 'list'
                })}>
                    {selectedStock ? renderDetailView() : (
                        <>
                            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-850 shrink-0">
                                <div><h1 className="text-xl font-black text-white mb-1 flex items-center gap-2"><TrendingUp className="text-indigo-500" size={24} /> 관심종목 시세</h1><p className="text-slate-500 text-xs font-medium">매매내역 관리: 종목 클릭</p></div>
                                <button onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} className={classNames("flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all", marketInfo.colorClass)}><Repeat size={14} />{marketInfo.name}</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-40"> 
                                {isLoading ? <div className="flex justify-center items-center h-40"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div> : displayStocks.length > 0 ? (
                                    <div className="space-y-3">
                                        {displayStocks.map(stock => {
                                            const holding = holdings.find(h => h.stockCode === stock.code);
                                            // [추가] 개별 종목 수익 및 수익률 계산
                                            const profit = holding ? (stock.price - holding.avgPrice) * holding.quantity : 0;
                                            const profitRate = (holding && holding.avgPrice > 0) ? ((stock.price - holding.avgPrice) / holding.avgPrice) * 100 : 0;

                                            return (
                                                <div key={stock.code} onClick={() => handleStockClick(stock)} className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-4 flex justify-between items-center hover:bg-slate-800/60 transition-all cursor-pointer group">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <div className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">{stock.name}</div>
                                                        {holding ? (
                                                            // [수정] 라벨 너비를 고정(w-8)하여 수치 데이터의 세로 줄을 딱 맞춤
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] font-bold border-t border-slate-800/50 pt-2">
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-600 font-medium uppercase w-8 shrink-0">손익</span>
                                                                    <span className={profit >= 0 ? 'text-red-400' : 'text-blue-400'}>
                                                                        {profit > 0 ? '+' : ''}{Math.floor(profit).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-600 font-medium uppercase w-10 shrink-0">수익률</span>
                                                                    <span className={classNames("px-1 rounded-[2px]", profit >= 0 ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400')}>
                                                                        {profitRate.toFixed(2)}%
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-600 font-medium uppercase w-8 shrink-0">수량</span>
                                                                    <span className="text-slate-300">{holding.quantity}주</span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-600 font-medium uppercase w-10 shrink-0">평단</span>
                                                                    <span className="text-slate-400 font-medium truncate">{holding.avgPrice.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            // 보유하지 않은 경우 종목코드 유지
                                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">{stock.code}</div>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className={classNames("text-lg font-black tabular-nums tracking-tight", getColorClass(stock.priceSign))}>{stock.price ? stock.price.toLocaleString() : '-'}</div>
                                                        <div className={classNames("text-xs font-bold mt-0.5 inline-flex items-center gap-1", getColorClass(stock.priceSign))}>
                                                            {getSignSymbol(stock.priceSign)} {Math.abs(stock.change || 0).toLocaleString()} ({stock.changeRate?.toFixed(2) || '0.00'}%)
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <div className="flex flex-col items-center justify-center h-64 text-slate-600"><p className="text-sm font-medium">즐겨찾기된 종목이 없습니다.</p></div>}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.4)] z-20">
                                <div className="flex items-center gap-2 mb-3"><Wallet className="text-indigo-400" size={16} /><h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">나의 보유현황 (KRW)</h3></div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-1.5"><span className="text-[11px] text-slate-500 font-bold">총 매수금</span><span className="text-sm font-black text-slate-200">{summary.totalInvested.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-1.5"><span className="text-[11px] text-slate-500 font-bold">총 평가금</span><span className="text-sm font-black text-slate-200">{summary.totalEvaluation.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] text-slate-500 font-bold">평가손익</span><span className={classNames("text-sm font-black", summary.totalProfit >= 0 ? 'text-red-400' : 'text-blue-400')}>{summary.totalProfit > 0 ? '+' : ''}{summary.totalProfit.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] text-slate-500 font-bold">수익률</span><span className={classNames("text-sm font-black px-2 py-0.5 rounded bg-slate-950 border border-slate-800", summary.returnRate >= 0 ? 'text-red-400' : 'text-blue-400')}>{summary.returnRate.toFixed(2)}%</span></div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={classNames("flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative h-full", {
                    "flex": activeSubTab === 'ai' || window.innerWidth >= 1024, "hidden lg:flex": activeSubTab !== 'ai'
                })}>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none"></div>
                    <div className="p-5 border-b border-slate-800 bg-slate-850 flex items-center gap-3 relative z-10 shrink-0"><div className="p-2 bg-indigo-500/10 rounded-lg"><Brain className="text-indigo-400" size={24} /></div><div><h2 className="text-xl font-black !text-white">전담 AI 분석가</h2><p className="text-xs text-indigo-400 font-bold">전략적 투자 브리핑</p></div></div>
                    <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative z-10 text-sm leading-relaxed text-slate-200">
                        {aiReport.split('\n').filter(l => l.trim()).map((line, i) => (
                            <div key={i} className="mb-3 last:mb-0">
                                {/^\d+\./.test(line.trim()) ? (
                                    <div className="flex gap-2"><span className="text-indigo-400 font-black shrink-0">{line.match(/^\d+\./)[0]}</span><span className="text-white font-bold">{line.replace(/^\d+\./, '').trim()}</span></div>
                                ) : <span className="text-slate-200 font-medium">{line}</span>}
                            </div>
                        )) || <div className="flex flex-col items-center justify-center h-64 text-slate-600"><Sparkles size={40} className="mb-4 opacity-10 animate-pulse" /><p className="text-sm">분석 중...</p></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WatchlistSummary;
