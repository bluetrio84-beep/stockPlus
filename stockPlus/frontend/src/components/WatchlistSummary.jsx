import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom'; // [v13.9] URL 파라미터 확인용 추가
import { fetchWatchlist, fetchStockPrice, fetchSpecialReport, fetchHoldings, addTrade, fetchTradeHistory, deleteTradeHistory, updateTradeHistory, fetchYoutubeGallery } from '../api/stockApi';
import { Repeat, Brain, TrendingUp, Sparkles, ArrowLeft, Plus, Calculator, Wallet, History, Calendar, Trash2, ArrowUp, ArrowDown, Youtube, Play, X } from 'lucide-react';
import classNames from 'classnames';
import { getSignSymbol, getColorClass, getMarketDisplay, getStockStatusBadge, isKosdaq } from '../utils/stockUtils';

const WatchlistSummary = () => {
    const location = useLocation(); // [v13.9] 추가
    const [displayStocks, setDisplayStocks] = useState([]); 
    const [holdings, setHoldings] = useState([]); 
    const [aiReport, setAiReport] = useState(''); 
    const [isLoading, setIsLoading] = useState(true);
    const [globalMarketMode, setGlobalMarketMode] = useState('UN'); 
    const [activeSubTab, setActiveSubTab] = useState('list'); 
    const [activeTab, setActiveTab] = useState('analysis'); // [v16.1] 상위 탭: analysis | youtube
    const [youtubeFeeds, setYoutubeFeeds] = useState([]); // [v16.1] 유튜브 피드
    const [selectedVideo, setSelectedVideo] = useState(null); // [v16.1] 재생용 영상
    const [selectedStockFilter, setSelectedStockFilter] = useState('all'); // [v16.1] 종목별 필터

    // [v16.1] 유튜브 피드 로드
    const loadYoutubeFeeds = useCallback(async () => {
        try {
            const data = await fetchYoutubeGallery();
            setYoutubeFeeds(data);
        } catch (e) {
            console.error("Failed to load youtube feeds", e);
        }
    }, []);

    // [v16.1] 영상 모달 뒤로가기 대응
    useEffect(() => {
        if (selectedVideo) {
            window.history.pushState({ modal: 'youtube' }, '');
            const handlePopState = () => setSelectedVideo(null);
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [selectedVideo]);

    // [v13.9] URL 파라미터 기반 탭 설정 로직 추가
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('tab') === 'ai') {
            setActiveTab('analysis');
            setActiveSubTab('ai');
        } else if (queryParams.get('tab') === 'youtube') {
            setActiveTab('youtube');
        }
        loadYoutubeFeeds(); 
    }, [location, loadYoutubeFeeds]);

    const [selectedStock, setSelectedStock] = useState(null); 
    const [tradeHistory, setTradeHistory] = useState([]); 
    const [isTradeFormOpen, setIsTradeFormOpen] = useState(false); 
    const [editingTrade, setEditingTrade] = useState(null); // [추가] 수정 중인 내역
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
                            marketType: w.marketType, // [추가] 코스닥 여부 판별용
                            stockStatus: priceData?.stockStatus, // [추가] 상태 배지용
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
        const eventSource = new EventSource('/api/sse/stocks');
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
                        marketType: prevSelected.marketType, // 유지
                        isExpected: u.isExpected, // [추가]
                        price: parseFloat(u.currentPrice), change: parseFloat(u.change), changeRate: parseFloat(u.changeRate)
                    }));
                }
                return u ? { 
                    ...s, 
                    ...u, 
                    marketType: s.marketType, // 유지
                    isExpected: u.isExpected, // [추가]
                    price: parseFloat(u.currentPrice), 
                    change: parseFloat(u.change), 
                    changeRate: parseFloat(u.changeRate) 
                } : s;
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
        resetTradeForm();
    };

    const resetTradeForm = () => {
        setTradeFormData({ tradeDate: new Date().toISOString().split('T')[0], price: selectedStock?.price || '', quantity: '' });
        setIsTradeFormOpen(false);
        setEditingTrade(null);
    };

    const handleHistoryItemClick = (item) => {
        setEditingTrade(item);
        setTradeFormData({
            tradeDate: item.tradeDate,
            price: item.price,
            quantity: item.quantity
        });
        setIsTradeFormOpen(true);
    };

    const handleSaveTrade = async () => {
        if (!tradeFormData.quantity || !tradeFormData.price) return alert("수량과 단가를 입력해주세요.");
        
        console.log(">>> [TradeSave] Start. Editing:", editingTrade);
        
        try {
            let result;
            if (editingTrade) {
                if (!editingTrade.id) {
                    console.error(">>> [TradeSave] Error: Missing ID for editing", editingTrade);
                    return alert("수정할 내역의 ID를 찾을 수 없습니다.");
                }
                // 수정
                result = await updateTradeHistory(editingTrade.id, {
                    quantity: parseInt(tradeFormData.quantity),
                    price: parseFloat(tradeFormData.price),
                    tradeDate: tradeFormData.tradeDate
                });
            } else {
                // 추가
                result = await addTrade({
                    stockCode: selectedStock.code, stockName: selectedStock.name,
                    quantity: parseInt(tradeFormData.quantity), price: parseFloat(tradeFormData.price),
                    tradeDate: tradeFormData.tradeDate 
                });
            }

            if (result === null) {
                throw new Error("API request returned null");
            }

            console.log(">>> [TradeSave] Success:", result);
            resetTradeForm();
            await refreshDetailData();
        } catch (e) { 
            console.error(">>> [TradeSave] Failed:", e);
            alert("저장에 실패했습니다. 콘솔 로그를 확인하세요."); 
        }
    };

    const handleDeleteTrade = async (id) => {
        if (!window.confirm("내역을 삭제하시겠습니까?")) return;
        try {
            await deleteTradeHistory(id || editingTrade.id);
            resetTradeForm();
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
        const badge = getStockStatusBadge(selectedStock);

        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="p-4 border-b border-[var(--theme-border)] flex items-center gap-3 bg-[var(--theme-header)] shrink-0">
                    <button onClick={() => setSelectedStock(null)} className="p-1.5 hover:bg-[var(--theme-bg)]/50 rounded-lg text-slate-400 transition-colors"><ArrowLeft size={20} /></button>
                    <div>
                        <h2 className="text-base font-bold text-[var(--theme-text)] leading-tight flex items-center gap-1.5 transition-colors">
                            {selectedStock.name}
                            {isKosdaq(selectedStock) && <span className="text-[var(--theme-point)]">*</span>}
                            {badge && <span className={classNames("text-[10px] px-1 rounded border leading-tight", badge.color)}>{badge.label}</span>}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono">{selectedStock.code}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
                    <div className="p-5 text-center bg-gradient-to-b from-[var(--theme-point)]/5 to-transparent border-b border-[var(--theme-border)]/30">
                        <div className={classNames("text-3xl font-black tracking-tight mb-0.5", getColorClass(selectedStock.priceSign, selectedStock.change))}>{selectedStock.price?.toLocaleString()}</div>
                        <div className={classNames("text-xs font-bold flex justify-center gap-1 items-center", getColorClass(selectedStock.priceSign, selectedStock.change))}>
                            <span>{getSignSymbol(selectedStock.priceSign, selectedStock.change)}</span>
                            <span>{Math.abs(selectedStock.change).toLocaleString()}</span>
                            <span>({selectedStock.changeRate?.toFixed(2)}%)</span>
                        </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-3">
                        <div className="bg-[var(--theme-header)] opacity-90 p-3 rounded-xl border border-[var(--theme-border)]/50"><p className="text-[10px] text-slate-500 font-bold mb-1 uppercase transition-colors">보유수량</p><p className="text-sm font-bold text-[var(--theme-text)] transition-colors">{holding.quantity}주</p></div>
                        <div className="bg-[var(--theme-header)] opacity-90 p-3 rounded-xl border border-[var(--theme-border)]/50"><p className="text-[10px] text-slate-500 font-bold mb-1 uppercase transition-colors">평균단가</p><p className="text-sm font-bold text-[var(--theme-text)] transition-colors">{holding.avgPrice?.toLocaleString()}원</p></div>
                        <div className="bg-[var(--theme-header)] opacity-90 p-3 rounded-xl col-span-2 flex justify-between items-center border border-[var(--theme-border)]/50">
                            <div><p className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase transition-colors">평가손익</p><p className={classNames("text-base font-black", profit >= 0 ? 'text-red-500' : 'text-blue-500')}>{profit > 0 ? '+' : ''}{profit.toLocaleString()}원</p></div>
                            <div className={classNames("text-xs font-black px-2 py-1 rounded bg-[var(--theme-bg)] border border-[var(--theme-border)] transition-colors", profitRate >= 0 ? 'text-red-500' : 'text-blue-500')}>{profitRate.toFixed(2)}%</div>
                        </div>
                    </div>

                    <div className="px-4 pb-4">
                        <div className="flex items-center gap-2 mb-3 mt-2"><History size={14} className="text-[var(--theme-point)]" /><h3 className="text-xs font-bold text-[var(--theme-text)] opacity-70 uppercase tracking-tight transition-colors">매매 히스토리 (클릭하여 수정)</h3></div>
                        {tradeHistory.length > 0 ? (
                            <div className="space-y-2">
                                {tradeHistory.map((item) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleHistoryItemClick(item)}
                                        className={classNames("bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-lg p-2.5 flex justify-between items-center group cursor-pointer transition-all", {
                                            "border-[var(--theme-point)] bg-[var(--theme-point)]/5": editingTrade?.id === item.id,
                                            "hover:bg-[var(--theme-header)]": editingTrade?.id !== item.id
                                        })}
                                    >
                                        <div className="flex items-center gap-2.5"><div className="bg-[var(--theme-header)] p-1.5 rounded-md"><Calendar size={12} className="text-slate-500" /></div><div><p className="text-[11px] font-bold text-[var(--theme-text)] transition-colors">{item.tradeDate}</p><p className="text-[10px] text-slate-500">{item.quantity}주 · {item.price.toLocaleString()}원</p></div></div>
                                        <div className="flex items-center gap-2"><div className="text-right"><p className="text-[11px] font-bold text-[var(--theme-text)] transition-colors">{(item.quantity * item.price).toLocaleString()}원</p><span className="text-[8px] text-[var(--theme-point)] font-bold">매수</span></div><div className="p-1.5 text-slate-600 group-hover:text-slate-400 transition-all"><Plus size={14} className="rotate-45" /></div></div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-center py-8 border border-dashed border-[var(--theme-border)] rounded-xl transition-colors"><p className="text-[10px] text-slate-500 font-medium">기록된 내역이 없습니다.</p></div>}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-[var(--theme-header)] border-t border-[var(--theme-border)] backdrop-blur-md">
                    {!isTradeFormOpen ? (
                        <button onClick={() => setIsTradeFormOpen(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex justify-center items-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10"><Plus size={18} /> 매매내역 추가</button>
                    ) : (
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 animate-in slide-in-from-bottom-2 duration-300">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2">{editingTrade ? '매매 내역 수정' : '매매 내역 추가'}</h4>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="col-span-2"><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">매수일자</label><input type="date" value={tradeFormData.tradeDate} onChange={e => setTradeFormData({...tradeFormData, tradeDate: e.target.value})} className="w-full bg-[var(--theme-header)] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"/></div>
                                <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">단가</label><input type="number" value={tradeFormData.price} onChange={e => setTradeFormData({...tradeFormData, price: e.target.value})} className="w-full bg-[var(--theme-header)] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"/></div>
                                <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">수량</label><input type="number" value={tradeFormData.quantity} onChange={e => setTradeFormData({...tradeFormData, quantity: e.target.value})} className="w-full bg-[var(--theme-header)] border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500"/></div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={resetTradeForm} className="flex-1 py-2 bg-slate-700 text-slate-300 font-bold rounded-lg text-xs">취소</button>
                                {editingTrade && (
                                    <button onClick={() => handleDeleteTrade(editingTrade.id)} className="px-3 py-2 bg-red-500/20 text-red-400 font-bold rounded-lg text-xs hover:bg-red-500/30 transition-colors"><Trash2 size={14} /></button>
                                )}
                                <button onClick={handleSaveTrade} className="flex-[2] py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs">저장</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full bg-[var(--theme-bg)] flex flex-col items-center overflow-hidden transition-colors duration-500">
            <div className="w-full flex lg:hidden bg-[var(--theme-header)] border-b border-[var(--theme-border)] shrink-0 transition-colors duration-500">
                <button onClick={() => setActiveTab('analysis')} className={classNames("flex-1 py-4 text-sm font-black border-b-2 transition-all", { "border-[var(--theme-point)] text-[var(--theme-text)] bg-[var(--theme-bg)]/50": activeTab === 'analysis', "border-transparent text-slate-500": activeTab !== 'analysis' })}>종목분석</button>
                <button onClick={() => { setActiveTab('youtube'); loadYoutubeFeeds(); }} className={classNames("flex-1 py-4 text-sm font-black border-b-2 transition-all", { "border-[var(--theme-point)] text-[var(--theme-text)] bg-[var(--theme-bg)]/50": activeTab === 'youtube', "border-transparent text-slate-500": activeTab !== 'youtube' })}>YouTube</button>
            </div>

            {/* 모바일 종목분석 내부 서브 탭 (activeTab === 'analysis' 일 때만 표시) */}
            {activeTab === 'analysis' && (
                <div className="w-full flex lg:hidden bg-[var(--theme-bg)]/80 border-b border-[var(--theme-border)]/50 shrink-0">
                    <button onClick={() => setActiveSubTab('list')} className={classNames("flex-1 py-2 text-[11px] font-bold transition-all", activeSubTab === 'list' ? "text-[var(--theme-point)]" : "text-slate-500")}>관심종목</button>
                    <button onClick={() => setActiveSubTab('ai')} className={classNames("flex-1 py-2 text-[11px] font-bold transition-all", activeSubTab === 'ai' ? "text-[var(--theme-point)]" : "text-slate-500")}>AI 분석</button>
                </div>
            )}

            {/* [v16.1] 데스크탑 전용 상단 탭 바 */}
            <div className="hidden lg:flex w-full max-w-7xl px-4 mt-2 mb-1">
                <div className="flex bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl overflow-hidden p-1 shadow-lg">
                    <button 
                        onClick={() => setActiveTab('analysis')}
                        className={classNames("px-8 py-2.5 text-sm font-black transition-all rounded-lg", activeTab === 'analysis' ? 'bg-[var(--theme-point)] text-white shadow-md' : 'text-slate-500 hover:text-[var(--theme-text)]')}
                    >
                        종목분석 (Price & AI)
                    </button>
                    <button 
                        onClick={() => { setActiveTab('youtube'); loadYoutubeFeeds(); }}
                        className={classNames("px-8 py-2.5 text-sm font-black transition-all rounded-lg", activeTab === 'youtube' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-[var(--theme-text)]')}
                    >
                        YouTube Intelligence
                    </button>
                </div>
            </div>

            <div className={classNames("w-full flex-1 overflow-hidden p-4 transition-all duration-500", activeTab === 'youtube' ? "max-w-none px-2 lg:px-4" : "max-w-7xl")}>
                {activeTab === 'analysis' ? (
                    <div className="h-full lg:grid lg:grid-cols-2 lg:gap-6">
                        <div className={classNames("flex flex-col bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden h-full relative transition-colors duration-500", {
                            "flex": activeSubTab === 'list' || window.innerWidth >= 1024, "hidden lg:flex": activeSubTab !== 'list'
                        })}>
                    {selectedStock ? renderDetailView() : (
                        <>
                            <div className="p-5 border-b border-[var(--theme-border)] flex justify-between items-center bg-[var(--theme-header)] opacity-95 shrink-0 transition-colors duration-500">
                                <div><h1 className="text-xl font-black text-[var(--theme-text)] mb-1 flex items-center gap-2"><TrendingUp className="text-[var(--theme-point)]" size={24} /> 관심종목 시세</h1><p className="text-slate-500 text-xs font-medium">매매내역 관리: 종목 클릭</p></div>
                                <button onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} className={classNames("flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all", marketInfo.colorClass)}><Repeat size={14} />{marketInfo.name}</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-40 transition-colors duration-500"> 
                                {isLoading ? <div className="flex justify-center items-center h-40"><div className="w-6 h-6 border-2 border-[var(--theme-point)] border-t-transparent rounded-full animate-spin"></div></div> : displayStocks.length > 0 ? (
                                    <div className="space-y-3">
                                        {displayStocks.map(stock => {
                                            const holding = holdings.find(h => h.stockCode === stock.code);
                                            const profit = holding ? (stock.price - holding.avgPrice) * holding.quantity : 0;
                                            const profitRate = (holding && holding.avgPrice > 0) ? ((stock.price - holding.avgPrice) / holding.avgPrice) * 100 : 0;
                                            const badge = getStockStatusBadge(stock);

                                            return (
                                                <div key={stock.code} onClick={() => handleStockClick(stock)} className="bg-[var(--theme-header)] opacity-90 border border-[var(--theme-border)]/60 rounded-xl p-4 flex justify-between items-center hover:bg-[var(--theme-bg)]/80 transition-all cursor-pointer group shadow-sm">
                                                    <div className="flex-1 min-w-0 mr-4">
                                                        <div className="text-base font-bold text-[var(--theme-text)] group-hover:text-[var(--theme-point)] transition-colors truncate flex items-center gap-1.5">
                                                            {stock.name}
                                                            {isKosdaq(stock) && <span className="text-[var(--theme-point)]">*</span>}
                                                            {badge && <span className={classNames("text-[10px] px-1 rounded border leading-tight", badge.color)}>{badge.label}</span>}
                                                        </div>
                                                        {holding ? (
                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] font-bold border-t border-[var(--theme-border)]/50 pt-2">
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-500 font-medium uppercase w-8 shrink-0">손익</span>
                                                                    <span className={profit >= 0 ? 'text-red-500' : 'text-blue-500'}>
                                                                        {profit > 0 ? '+' : ''}{Math.floor(profit).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-500 font-medium uppercase w-10 shrink-0">수익률</span>
                                                                    <span className={classNames("px-1 rounded-[2px]", profit >= 0 ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500')}>
                                                                        {profitRate.toFixed(2)}%
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-500 font-medium uppercase w-8 shrink-0">수량</span>
                                                                    <span className="text-[var(--theme-text)] opacity-70 transition-colors">{holding.quantity}주</span>
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <span className="text-[9px] text-slate-500 font-medium uppercase w-10 shrink-0">평단</span>
                                                                    <span className="text-slate-500 font-medium truncate">{holding.avgPrice.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">{stock.code}</div>
                                                        )}
                                                    </div>
                                                    <div className="text-right shrink-0 min-w-[110px] flex flex-col items-end">
                                                        <div className={classNames("text-lg font-black tabular-nums tracking-tight text-right whitespace-nowrap", getColorClass(stock.priceSign, stock.change))}>{stock.price ? stock.price.toLocaleString() : '-'}</div>
                                                        <div className={classNames("text-xs font-bold mt-0.5 inline-flex items-center gap-1 justify-end text-right whitespace-nowrap", getColorClass(stock.priceSign, stock.change))}>
                                                            {getSignSymbol(stock.priceSign, stock.change)} {Math.abs(stock.change || 0).toLocaleString()} ({stock.changeRate?.toFixed(2) || '0.00'}%)
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : <div className="flex flex-col items-center justify-center h-64 text-slate-600"><p className="text-sm font-medium">즐겨찾기된 종목이 없습니다.</p></div>}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-[var(--theme-header)]/95 backdrop-blur-md border-t border-[var(--theme-border)] p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-20 transition-colors duration-500">
                                <div className="flex items-center gap-2 mb-3"><Wallet className="text-[var(--theme-point)]" size={16} /><h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">나의 보유현황 (KRW)</h3></div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                    <div className="flex justify-between items-center border-b border-[var(--theme-border)]/50 pb-1.5"><span className="text-[11px] text-slate-500 font-bold">총 매수금</span><span className="text-sm font-black text-[var(--theme-text)] transition-colors">{summary.totalInvested.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center border-b border-[var(--theme-border)]/50 pb-1.5"><span className="text-[11px] text-slate-500 font-bold">총 평가금</span><span className="text-sm font-black text-[var(--theme-text)] transition-colors">{summary.totalEvaluation.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] text-slate-500 font-bold">평가손익</span><span className={classNames("text-sm font-black", summary.totalProfit >= 0 ? 'text-red-500' : 'text-blue-500')}>{summary.totalProfit > 0 ? '+' : ''}{summary.totalProfit.toLocaleString()}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[11px] text-slate-500 font-bold">수익률</span><span className={classNames("text-sm font-black px-2 py-0.5 rounded bg-[var(--theme-bg)] border border-[var(--theme-border)] transition-colors", summary.returnRate >= 0 ? 'text-red-500' : 'text-blue-500')}>{summary.returnRate.toFixed(2)}%</span></div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className={classNames("flex flex-col bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden relative h-full transition-colors duration-500", {
                    "flex": activeSubTab === 'ai' || window.innerWidth >= 1024, "hidden lg:flex": activeSubTab !== 'ai'
                })}>
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-point)]/5 to-purple-500/5 pointer-events-none"></div>
                    <div className="p-5 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex items-center gap-3 relative z-10 shrink-0 transition-colors duration-500"><div className="p-2 bg-[var(--theme-point)]/10 rounded-lg"><Brain className="text-[var(--theme-point)]" size={24} /></div><div><h2 className="text-xl font-black text-[var(--theme-text)] transition-colors">전담 AI 분석가</h2><p className="text-xs text-[var(--theme-point)] font-bold transition-colors">전략적 투자 브리핑</p></div></div>
                    <div className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar relative z-10 text-sm leading-relaxed text-[var(--theme-text)] transition-colors">
                        {aiReport.split('\n').filter(l => l.trim()).map((line, i) => (
                            <div key={i} className="mb-4 last:mb-0">
                                {/^\d+\./.test(line.trim()) ? (
                                    <div className="flex gap-2.5">
                                        <span className="text-[var(--theme-point)] font-black shrink-0 text-base">{line.match(/^\d+\./)[0]}</span>
                                        <span className="text-[var(--theme-text)] font-black text-[15px] leading-tight transition-colors">{line.replace(/^\d+\./, '').trim()}</span>
                                    </div>
                                ) : <span className="text-[var(--theme-text)] font-bold text-[14px] opacity-100 transition-colors">{line}</span>}
                            </div>
                        )) || <div className="flex flex-col items-center justify-center h-64 text-slate-600"><Sparkles size={40} className="mb-4 opacity-10 animate-pulse" /><p className="text-sm">분석 중...</p></div>}
                    </div>
                </div>
                </div>
                ) : (
                /* [v16.1] 광활한 유튜브 갤러리 레이아웃 (activeTab === 'youtube') */
                <div className="flex flex-col bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden relative h-full transition-colors duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-purple-500/5 pointer-events-none"></div>
                <div className="p-5 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex justify-between items-center shrink-0 transition-colors duration-500 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg"><Youtube className="text-red-500" size={24} /></div>
                        <div><h2 className="text-xl font-black text-[var(--theme-text)] transition-colors">Premium Stock Academy</h2><p className="text-xs text-red-500 font-bold transition-colors">주식 공부 · 종목 추천 · 시장 전략 (최근 1개월)</p></div>
                    </div>
                    <button onClick={loadYoutubeFeeds} className="p-2 hover:bg-[var(--theme-border)]/30 rounded-full transition-colors"><Repeat size={16} className="text-slate-500" /></button>
                </div>

                {/* 카테고리 필터 칩 */}
                <div className="px-6 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-[var(--theme-border)]/30 bg-[var(--theme-bg)]/30 shrink-0 relative z-10">
                    <button 
                        onClick={() => setSelectedStockFilter('all')}
                        className={classNames("px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border", selectedStockFilter === 'all' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-[var(--theme-header)] border-[var(--theme-border)] text-slate-500')}
                    >
                        전체 보기
                    </button>
                    {Array.from(new Set(youtubeFeeds.map(f => f.stockName))).map(name => (
                        <button 
                            key={name}
                            onClick={() => setSelectedStockFilter(name)}
                            className={classNames("px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border", selectedStockFilter === name ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-[var(--theme-header)] border-[var(--theme-border)] text-slate-500')}
                        >
                            {name}
                        </button>
                    ))}
                </div>
                {/* 광활한 그리드 피드 */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar bg-[var(--theme-bg)]/20 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">                        {youtubeFeeds.filter(f => selectedStockFilter === 'all' || f.stockName === selectedStockFilter).map((feed) => (
                            <div 
                                key={feed.videoId} 
                                onClick={() => setSelectedVideo(feed)}
                                className="group bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl overflow-hidden cursor-pointer hover:border-red-500/50 transition-all shadow-xl active:scale-[0.98]"
                            >
                                <div className="relative aspect-video overflow-hidden">
                                    <img src={feed.thumbnailUrl} alt={feed.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/0 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-2xl translate-y-4 group-hover:translate-y-0 transition-all duration-300"><Play size={24} fill="white" /></div>
                                    </div>
                                    <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-0.5 rounded text-[10px] font-black text-white backdrop-blur-md border border-white/10">PREMIUM</div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-sm font-black text-[var(--theme-text)] transition-colors line-clamp-2 mb-3 leading-snug group-hover:text-red-500 h-10">{feed.title}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[var(--theme-bg)] rounded-full flex items-center justify-center text-xs font-black text-red-500 border border-[var(--theme-border)] shadow-inner">{feed.channelName[0]}</div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-slate-500 truncate">{feed.channelName}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">조회수 {feed.viewCountStr || '평가 중'} · {feed.publishedAt.split('T')[0]}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-[var(--theme-border)]/50 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-red-500 opacity-80 uppercase tracking-tighter bg-red-500/5 px-2 py-0.5 rounded">{feed.stockName} Intelligence</span>
                                        <span className="text-[9px] font-bold text-slate-500 italic">PREMIUM ANALYSIS</span>
                                    </div>                                </div>
                            </div>
                        ))}
                    </div>
                    {youtubeFeeds.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-96 text-slate-600">
                            <div className="p-6 bg-red-500/5 rounded-full mb-6 animate-pulse"><Youtube size={64} className="opacity-20 text-red-500" /></div>
                            <p className="text-lg font-black text-slate-500">수집된 영상 인텔리전스가 없습니다.</p>
                            <p className="text-sm text-slate-600 mt-2">API 키 설정 및 수집기 가동 상태를 확인하세요.</p>
                        </div>
                    )}
                </div>
                </div>
                )}
                </div>

                {/* [v16.1] 광고 없는 플레이어 모달 */}
                {selectedVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-20 bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                <div className="hidden lg:block text-right">
                    <h2 className="text-white font-black text-lg">{selectedVideo.title}</h2>
                    <p className="text-red-500 font-bold text-sm">Ad-Free Intelligent Player Mode</p>
                </div>
                <button onClick={() => setSelectedVideo(null)} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X size={24} /></button>
                </div>
                <div className="w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative">
                <iframe 
                    className="w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${selectedVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        </div>
                                    )}
                            </div>
                        );
                    };

                    export default WatchlistSummary;
