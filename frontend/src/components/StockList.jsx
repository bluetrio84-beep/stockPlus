import React, { useState, useEffect, useRef, useCallback } from 'react';
import StockListItem from './StockListItem';
import { fetchWatchlist, addToWatchlist, deleteFromWatchlist, deleteAllFromWatchlist, searchStocks, fetchStockPrice, toggleFavorite } from '../api/stockApi';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, Repeat, Search } from 'lucide-react';

const StockList = ({ searchKeyword: externalSearchKeyword, setSearchKeyword: setExternalSearchKeyword }) => {
    const navigate = useNavigate();
    const [watchlist, setWatchlist] = useState([]);
    const [displayStocks, setDisplayStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeWatchlistTab, setActiveWatchlistTab] = useState(1);
    const [globalMarketMode, setGlobalMarketMode] = useState('J');
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    
    const [localSearchKeyword, setLocalSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchTimeoutRef = useRef(null);
    const stockUpdatesBuffer = useRef(new Map());
    const eventSourceRef = useRef(null);

    const loadWatchlist = useCallback(async (market, groupId) => {
        setIsLoading(true);
        try {
            const dbWatchlist = await fetchWatchlist(groupId);
            if (dbWatchlist && dbWatchlist.length > 0) {
                const stocksWithInitialData = await Promise.all(
                    dbWatchlist.map(async (w) => {
                        const priceData = await fetchStockPrice(w.stockCode, market);
                        return {
                            id: w.stockCode, name: w.stockName, code: w.stockCode,
                            exchangeCode: market, 
                            isFavorite: w.isFavorite,
                            price: parseFloat(priceData?.currentPrice) || 0,
                            change: parseFloat(priceData?.change) || 0,
                            changeRate: parseFloat(priceData?.changeRate) || 0,
                            priceSign: priceData?.priceSign || '3',
                            volume: priceData?.volume || '-',
                            isExpected: priceData?.isExpected || false,
                        };
                    })
                );
                setDisplayStocks(stocksWithInitialData);
            } else {
                setDisplayStocks([]);
            }
        } catch (e) {
            console.error("Failed to load watchlist:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWatchlist(globalMarketMode, activeWatchlistTab);
    }, [globalMarketMode, activeWatchlistTab, loadWatchlist]);

    // SSE Connection
    const connectSSE = useCallback(() => {
        if (eventSourceRef.current) eventSourceRef.current.close();
        const eventSource = new EventSource('/stockPlus/api/sse/stocks');
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('priceUpdate', (e) => {
            try {
                let updates = JSON.parse(e.data);
                if (!Array.isArray(updates)) updates = [updates];
                updates.forEach(update => {
                    const key = `${update.stockCode}-${update.exchangeCode || 'J'}`;
                    stockUpdatesBuffer.current.set(key, update);
                });
            } catch (error) { console.error("SSE Parse Error:", error); }
        });

        eventSource.onerror = () => {
            eventSource.close();
            setTimeout(connectSSE, 3000);
        };
    }, []);

    useEffect(() => {
        connectSSE();
        return () => eventSourceRef.current?.close();
    }, [connectSSE]);

    // Buffer Flush
    useEffect(() => {
        const interval = setInterval(() => {
            if (stockUpdatesBuffer.current.size === 0) return;
            const updatesMap = new Map(stockUpdatesBuffer.current);
            stockUpdatesBuffer.current.clear();

            setDisplayStocks(prevStocks => {
                let hasChange = false;
                const nextStocks = prevStocks.map(stock => {
                    const key = `${stock.code}-${stock.exchangeCode}`;
                    let update = updatesMap.get(key);
                    if (!update && stock.exchangeCode === 'UN') {
                        update = updatesMap.get(`${stock.code}-J`) || updatesMap.get(`${stock.code}-NX`);
                    }
                    if (update && update.currentPrice) {
                        hasChange = true;
                        return { 
                            ...stock, 
                            ...update, 
                            price: parseFloat(update.currentPrice),
                            change: parseFloat(update.change),
                            changeRate: parseFloat(update.changeRate)
                        };
                    }
                    return stock;
                });
                return hasChange ? nextStocks : prevStocks;
            });
        }, 200);
        return () => clearInterval(interval);
    }, []);

    const handleSearch = (keyword) => {
        setLocalSearchKeyword(keyword);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!keyword.trim()) { setSearchResults([]); return; }
        searchTimeoutRef.current = setTimeout(async () => {
            const results = await searchStocks(keyword);
            setSearchResults(results);
        }, 300);
    };

    const handleSearchResultClick = async (stock) => {
        await addToWatchlist({ ...stock, exchangeCode: globalMarketMode, groupId: activeWatchlistTab, isFavorite: false });
        await loadWatchlist(globalMarketMode, activeWatchlistTab);
        setLocalSearchKeyword(''); setSearchResults([]);
    };

    const handleDeleteStock = async (e, stockCode) => {
        e.stopPropagation();
        if (window.confirm('정말 삭제하시겠습니까?')) {
            await deleteFromWatchlist(stockCode, activeWatchlistTab);
            await loadWatchlist(globalMarketMode, activeWatchlistTab);
        }
    };

    const handleDeleteAll = async () => {
        if (window.confirm(`관심 ${activeWatchlistTab} 그룹의 모든 종목을 삭제하시겠습니까?`)) {
            await deleteAllFromWatchlist(activeWatchlistTab);
            await loadWatchlist(globalMarketMode, activeWatchlistTab);
        }
    };

    const handleToggleFavorite = async (stockCode, exchangeCode, newIsFavorite) => {
        setDisplayStocks(prev => prev.map(s => s.code === stockCode ? { ...s, isFavorite: newIsFavorite } : s));
        await toggleFavorite(stockCode, activeWatchlistTab, newIsFavorite);
    };

    return (
        <div className="flex flex-col h-full bg-slate-900">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-800 bg-slate-850 space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex border-slate-700 bg-slate-950 rounded-lg p-1">
                        {[1, 2, 3, 4].map(tabId => (
                            <button key={tabId} onClick={() => setActiveWatchlistTab(tabId)} className={classNames("px-4 py-1.5 text-xs font-bold rounded-md transition-all", { "bg-indigo-600 text-white shadow-lg": activeWatchlistTab === tabId, "text-slate-500 hover:text-slate-300": activeWatchlistTab !== tabId })}>관심 {tabId}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded bg-slate-800 text-indigo-400 border border-slate-700 hover:bg-slate-700 transition-colors"><Repeat size={12} />{globalMarketMode === 'J' ? 'KRX' : (globalMarketMode === 'NX' ? 'NXT' : 'UN')}</button>
                        {isEditMode && (
                            <button onClick={handleDeleteAll} className="text-xs font-bold px-3 py-1.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1">
                                <Trash2 size={12} />
                                전체삭제
                            </button>
                        )}
                        <button onClick={() => setIsEditMode(!isEditMode)} className={classNames("text-xs font-bold px-3 py-1.5 rounded transition-colors", { "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30": isEditMode, "bg-slate-800 text-slate-400 border border-slate-700": !isEditMode })}>{isEditMode ? '완료' : '편집'}</button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input type="text" placeholder="종목 검색 및 추가..." className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all shadow-inner" value={localSearchKeyword} onChange={(e) => handleSearch(e.target.value)} />
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto ring-1 ring-black/50">
                            {searchResults.map(stock => (
                                <div key={stock.code} onClick={() => handleSearchResultClick(stock)} className="p-4 hover:bg-slate-800 cursor-pointer border-b border-slate-800 last:border-0 flex justify-between items-center group transition-colors">
                                    <div>
                                        <div className="font-bold text-slate-200 group-hover:text-indigo-400">{stock.name}</div>
                                        <div className="text-xs text-slate-500">{stock.code} | {stock.market}</div>
                                    </div>
                                    <Plus size={18} className="text-slate-500 group-hover:text-indigo-400" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">관심종목을 불러오는 중입니다...</p>
                    </div>
                ) : displayStocks.length > 0 ? (
                    <div className="space-y-1">
                        {displayStocks.map(stock => (
                            <div key={`${stock.code}-${stock.exchangeCode}`} className="relative group animate-in fade-in slide-in-from-bottom-1 duration-200">
                                <StockListItem stock={stock} onStockClick={(s) => navigate(`/stock/${s.code}`)} onToggleFavorite={handleToggleFavorite} />
                                {isEditMode && (
                                    <button onClick={(e) => handleDeleteStock(e, stock.code)} className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg z-10 transition-all shadow-lg"><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-600 text-center px-10">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4"><Plus size={32} className="opacity-20" /></div>
                        <p className="text-sm">관심 {activeWatchlistTab}에 등록된 종목이 없습니다.<br/>위 검색창에서 종목을 추가해 보세요.</p>
                    </div>
                )}
            </div>

            {/* Delete All Modal Reused implicitly via window.confirm for simplicity in this component */}
        </div>
    );
};

export default StockList;