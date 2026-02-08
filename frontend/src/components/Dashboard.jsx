import React, { useState, useEffect, useRef, useCallback } from 'react';
import StockListItem from './StockListItem';
import ChartWidget from './ChartWidget';
import NewsFeed from './NewsFeed';
import MobileNav from './MobileNav';
import { fetchWatchlist, addToWatchlist, deleteFromWatchlist, deleteAllFromWatchlist, searchStocks, fetchStockChart, fetchStockPrice, fetchRecentNews, fetchMarketInsight, fetchSpecialReport, toggleFavorite } from '../api/stockApi';
import { getSignSymbol, getColorClass, getMarketDisplay } from '../utils/stockUtils';
import classNames from 'classnames';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Plus, Trash2, Repeat, Search, Sparkles, ArrowLeft, Brain, ChevronDown, ChevronRight, LayoutList, AlertTriangle, Star } from 'lucide-react';

function Dashboard() {
  const navigate = useNavigate();
  const { stockCode: stockCodeFromUrl } = useParams();

  const [displayStocks, setDisplayStocks] = useState([]);
  const [news, setNews] = useState([]);
  const [marketInsight, setMarketInsight] = useState('');
  const [specialReport, setSpecialReport] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [watchlistSubTab, setWatchlistSubTab] = useState('list'); // 'list' or 'ai'
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [globalMarketMode, setGlobalMarketMode] = useState('J');
  const [activeWatchlistTab, setActiveWatchlistTab] = useState(1);
  const [currentPeriod, setCurrentPeriod] = useState('1D');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeoutRef = useRef(null);
  const stockUpdatesBuffer = useRef(new Map());

  // 삭제 확인 팝업 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'ALL' or stockCode

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

  // 차트 로딩 로직
  const loadChartForPeriod = useCallback(async (stockCode, market, period) => {
    if (!stockCode) return;
    try {
        const newChartData = await fetchStockChart(stockCode, market, period);
        setSelectedStock(prev => {
            if (prev && prev.code === stockCode) {
                return { ...prev, chartData: newChartData || [], lastLoadedPeriod: period, exchangeCode: market };
            }
            return prev;
        });
        setDisplayStocks(prevList => prevList.map(s => 
            s.code === stockCode 
                ? { ...s, chartData: newChartData || [], lastLoadedPeriod: period, exchangeCode: market } 
                : s
        ));
    } catch (e) { console.error("Chart load failed", e); }
  }, []);

  const loadWatchlist = useCallback(async (market, groupId) => {
    setIsLoading(true);
    try {
        const dbWatchlist = await fetchWatchlist(groupId);
        if (dbWatchlist && dbWatchlist.length > 0) {
          const stocksWithInitialData = await Promise.all(
            dbWatchlist.map(async (w) => {
              const priceData = await fetchStockPrice(w.stockCode, market);
              const existing = displayStocks.find(s => s.code === w.stockCode);
              return {
                id: w.stockCode, name: w.stockName, code: w.stockCode,
                exchangeCode: market, exchangeName: market === 'NX' ? 'NXT' : (market === 'UN' ? 'UN' : 'KRX'),
                isFavorite: w.isFavorite,
                price: parseFloat(priceData?.currentPrice) || 0,
                change: parseFloat(priceData?.change) || 0,
                changeRate: parseFloat(priceData?.changeRate) || 0,
                priceSign: priceData?.priceSign || '3',
                volume: priceData?.volume || '-',
                isExpected: priceData?.isExpected || false,
                open: priceData?.open || 0, high: priceData?.high || 0, low: priceData?.low || 0,
                prevClose: priceData?.prevClose || 0, marketCap: priceData?.marketCap || 0, listedShares: priceData?.listedShares || 0,
                high52w: priceData?.high52w || 0, low52w: priceData?.low52w || 0,
                chartData: existing?.chartData || [],
                lastLoadedPeriod: existing?.lastLoadedPeriod
              };
            })
          );
          setDisplayStocks(stocksWithInitialData);
          if (stockCodeFromUrl) {
              const target = stocksWithInitialData.find(s => s.code === stockCodeFromUrl);
              if (target) setSelectedStock(prev => (prev && prev.code === target.code) ? { ...target, chartData: prev.chartData || target.chartData } : target);
          }
        } else setDisplayStocks([]);
    } catch (e) { console.error("Watchlist load failed", e); }
    setIsLoading(false);
  }, [stockCodeFromUrl, globalMarketMode, activeWatchlistTab]);

  useEffect(() => { loadWatchlist(globalMarketMode, activeWatchlistTab); }, [globalMarketMode, activeWatchlistTab, loadWatchlist]);

  useEffect(() => {
    if (stockCodeFromUrl && displayStocks.length > 0) {
      const target = displayStocks.find(s => s.code === stockCodeFromUrl);
      if (target && (!selectedStock || selectedStock.code !== target.code)) {
          setSelectedStock({ ...target, exchangeCode: globalMarketMode });
      }
    }
  }, [stockCodeFromUrl, displayStocks, globalMarketMode]);

  useEffect(() => {
    if (selectedStock?.code) {
        const needsLoad = !selectedStock.lastLoadedPeriod || 
                          selectedStock.lastLoadedPeriod !== currentPeriod || 
                          selectedStock.exchangeCode !== globalMarketMode;
        if (needsLoad) loadChartForPeriod(selectedStock.code, globalMarketMode, currentPeriod);
    }
  }, [selectedStock?.code, currentPeriod, globalMarketMode, loadChartForPeriod]);

  useEffect(() => {
    const loadData = () => {
        fetchRecentNews().then(setNews).catch(() => {});
        fetchMarketInsight().then(setMarketInsight).catch(() => {});
        fetchSpecialReport().then(setSpecialReport).catch(() => {});
    };
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('/stockPlus/api/sse/stocks');
    eventSource.addEventListener('priceUpdate', (e) => {
        try {
            let updates = JSON.parse(e.data);
            if (!Array.isArray(updates)) updates = [updates];
            updates.forEach(upd => stockUpdatesBuffer.current.set(`${upd.stockCode}-${upd.exchangeCode || 'J'}`, upd));
        } catch (err) {}
    });
    const flushInterval = setInterval(() => {
        if (stockUpdatesBuffer.current.size === 0) return;
        const updates = new Map(stockUpdatesBuffer.current);
        stockUpdatesBuffer.current.clear();
        setDisplayStocks(prev => prev.map(s => {
            let u = updates.get(`${s.code}-${s.exchangeCode}`);
            if (!u && s.exchangeCode === 'UN') u = updates.get(`${s.code}-J`) || updates.get(`${s.code}-NX`);
            return u ? { ...s, ...u, price: parseFloat(u.currentPrice), change: parseFloat(u.change), changeRate: parseFloat(u.changeRate) } : s;
        }));
        setSelectedStock(prev => {
            if (!prev) return null;
            let u = updates.get(`${prev.code}-${prev.exchangeCode}`);
            if (!u && prev.exchangeCode === 'UN') u = updates.get(`${prev.code}-J`) || updates.get(`${prev.code}-NX`);
            return u ? { ...prev, ...u, price: parseFloat(u.currentPrice), change: parseFloat(u.change), changeRate: parseFloat(u.changeRate) } : prev;
        });
    }, 200);
    return () => { eventSource.close(); clearInterval(flushInterval); };
  }, []);

  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
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
    setSearchKeyword(''); setSearchResults([]); setShowMobileSearch(false);
  };

  const handleDeleteStock = async (e, stockCode) => {
    if (e) e.stopPropagation();
    if (window.confirm('정말 삭제하시겠습니까?')) {
        await deleteFromWatchlist(stockCode, activeWatchlistTab);
        await loadWatchlist(globalMarketMode, activeWatchlistTab);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('그룹의 모든 종목을 삭제하시겠습니까?')) {
        await deleteAllFromWatchlist(activeWatchlistTab);
        await loadWatchlist(globalMarketMode, activeWatchlistTab);
    }
  };

  const confirmDelete = (e, target) => {
      if (e) e.stopPropagation();
      setDeleteTarget(target);
      setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
      try {
          if (deleteTarget === 'ALL') {
              await deleteAllFromWatchlist(activeWatchlistTab);
          } else if (deleteTarget) {
              await deleteFromWatchlist(deleteTarget, activeWatchlistTab);
          }
          await loadWatchlist(globalMarketMode, activeWatchlistTab);
      } catch (err) {
          console.error("Delete failed", err);
      } finally {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
      }
  };

  const marketInfo = getMarketDisplay(globalMarketMode);

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-slate-950">
        {/* Desktop View */}
        <div className="hidden lg:grid grid-cols-12 gap-4 p-4 flex-1 h-full overflow-hidden">
            <div className="col-span-3 h-full flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-slate-800 bg-slate-850 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-300 text-sm">관심 종목</span>
                        <div className="flex gap-1.5">
                            <button onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} className={classNames("flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded border transition-all shadow-sm", marketInfo.colorClass)}>
                                <Repeat size={10}/>{marketInfo.name}
                            </button>
                            <button onClick={() => setIsEditMode(!isEditMode)} className={classNames("text-xs font-bold px-2 py-1 rounded transition-colors", { "text-indigo-400 bg-indigo-400/10": isEditMode, "text-slate-500 hover:text-slate-300": !isEditMode })}>{isEditMode ? '완료' : '편집'}</button>
                            {isEditMode && displayStocks.length > 0 && (
                                <button onClick={(e) => confirmDelete(e, 'ALL')} className="text-xs font-bold px-2 py-1 rounded text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors">전체 삭제</button>
                            )}
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="text" placeholder="종목 검색..." className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none" value={searchKeyword} onChange={(e) => handleSearch(e.target.value)} />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                                {searchResults.map(s => <div key={s.code} onClick={() => handleSearchResultClick(s)} className="p-2.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800 flex justify-between items-center group"><div><div className="font-bold text-slate-200 text-xs group-hover:text-indigo-400">{s.name}</div><div className="text-[10px] text-slate-500">{s.code}</div></div><Plus size={14} className="text-slate-500" /></div>)}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex border-b border-slate-800 bg-slate-900">
                    {[1, 2, 3, 4].map(id => <button key={id} onClick={() => setActiveWatchlistTab(id)} className={classNames("flex-1 py-2 text-xs font-bold transition-all", { "text-white border-b-2 border-indigo-500 bg-slate-800/50": activeWatchlistTab === id, "text-slate-500 hover:text-slate-300": activeWatchlistTab !== id })}>관심 {id}</button>)}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {displayStocks.map(s => (
                        <div key={`${s.code}-${s.exchangeCode}`} className="relative group">
                            <StockListItem stock={s} isSelected={selectedStock?.code === s.code} onStockClick={(st) => navigate(`/stock/${st.code}`)} onToggleFavorite={(c, e, f) => { setDisplayStocks(p => p.map(x => x.code === c ? { ...x, isFavorite: f } : x)); toggleFavorite(c, activeWatchlistTab, f); }} />
                            {isEditMode && <button onClick={(e) => confirmDelete(e, s.code)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500/20 text-red-500 p-1.5 rounded-full z-10 transition-colors"><Trash2 size={14} /></button>}
                        </div>
                    ))}
                </div>
            </div>
            <div className="col-span-6 h-full flex flex-col overflow-hidden">
                 {selectedStock ? <ChartWidget stock={selectedStock} onPeriodChange={setCurrentPeriod} currentPeriod={currentPeriod} onExchangeChange={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} marketMode={globalMarketMode} /> : <div className="h-full flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl text-slate-500"><Search size={48} className="mb-4 opacity-20" /><p>종목을 선택하세요.</p></div>}
            </div>
            <div className="col-span-3 h-full flex flex-col gap-4 overflow-hidden">
                <div className="h-[35%] bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-slate-800 bg-slate-850 flex items-center gap-2"><Sparkles className="text-yellow-400" size={18} /><h3 className="font-bold text-slate-200 text-sm">AI Market Insight</h3></div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-900">
                        {renderFormattedText(marketInsight) || <div className="text-slate-500 text-sm italic">요약을 불러오는 중입니다...</div>}
                    </div>
                </div>
                <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden"><NewsFeed news={news} /></div>
            </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden flex-1 overflow-hidden relative h-full"> 
            <div className={classNames("transition-transform duration-300 absolute inset-0 bottom-16 bg-slate-950 z-10 h-full", { "translate-x-0": !stockCodeFromUrl, "-translate-x-full": !!stockCodeFromUrl })}>
                 {/* 1. 관심종목요약 탭 (home) - 상단 탭 배치 */}
                 {activeTab === 'home' && <div className="h-full p-2 pb-24 flex flex-col relative">
                     <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-0">
                        <div className="flex border-b border-slate-800 bg-slate-900">
                            <button onClick={() => setWatchlistSubTab('list')} className={classNames("flex-1 py-3 text-sm font-bold transition-all border-b-2", { "border-indigo-500 text-white bg-slate-800/50": watchlistSubTab === 'list', "border-transparent text-slate-500": watchlistSubTab !== 'list' })}>관심종목시세</button>
                            <button onClick={() => setWatchlistSubTab('ai')} className={classNames("flex-1 py-3 text-sm font-bold transition-all border-b-2", { "border-indigo-500 text-white bg-slate-800/50": watchlistSubTab === 'ai', "border-transparent text-slate-500": watchlistSubTab !== 'ai' })}>AI 분석</button>
                        </div>
                        {watchlistSubTab === 'list' ? (
                            <div className="h-full p-4 overflow-y-auto custom-scrollbar">
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
                                    <h3 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2"><Sparkles size={14} className="text-yellow-500"/> AI Market Insight</h3>
                                    {renderFormattedText(marketInsight)}
                                </div>
                                <h3 className="font-bold text-slate-300 mb-3 px-1 flex items-center gap-2"><Star size={16} className="text-yellow-500 fill-yellow-500" /> 주요 관심 종목</h3>
                                <div className="space-y-3">
                                    {displayStocks.filter(s => s.isFavorite).length > 0 ? displayStocks.filter(s => s.isFavorite).map(stock => (
                                        <div key={`home-${stock.code}`} onClick={() => navigate(`/stock/${stock.code}`)} className="bg-slate-850 border border-slate-800 rounded-xl p-4 flex justify-between items-center active:bg-slate-800 transition-colors shadow-sm">
                                            <div><div className="font-bold text-slate-200 text-base">{stock.name}</div><div className="text-[10px] text-slate-500">{stock.code} | {stock.exchangeName}</div></div>
                                            <div className="flex flex-col items-end"><div className={classNames("text-xl font-bold", getColorClass(stock.priceSign))}>{stock.price.toLocaleString()}</div><div className={classNames("text-xs font-medium", getColorClass(stock.priceSign))}>{getSignSymbol(stock.priceSign)} {Math.abs(stock.changeRate).toFixed(2)}%</div></div>
                                        </div>
                                    )) : <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-slate-900/50 rounded-xl border border-dashed border-slate-800"><Star size={32} className="mb-2 opacity-10" /><p className="text-xs">즐겨찾기한 종목이 없습니다.</p></div>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-slate-900">
                                <div className="p-4 border-b border-slate-800 bg-slate-850 flex items-center gap-3"><div className="p-2 bg-indigo-500/20 rounded-lg"><Brain className="text-indigo-400" size={20} /></div><div><h3 className="font-black text-white text-base">전담 AI 분석가 리포트</h3><p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Strategic Analysis</p></div></div>
                                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-950/50">{renderFormattedText(specialReport) || <div className="flex flex-col items-center justify-center h-full text-slate-600"><Sparkles size={40} className="mb-4 opacity-10 animate-pulse" /><p className="text-sm font-medium">분석 리포트를 생성하고 있습니다...</p></div>}</div>
                            </div>
                        )}
                     </div>
                 </div>}

                 {/* 2. 종목검색 탭 (watchlist) - 검색 아이콘 클릭 시 검색창 노출 */}
                 {activeTab === 'watchlist' && <div className="h-full p-2 pb-24 flex flex-col relative">
                     <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-3 bg-slate-850 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-300 shrink-0">관심 종목</span>
                                <button onClick={() => setShowMobileSearch(true)} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors">
                                    <Search size={18} />
                                </button>
                            </div>
                            <div className="flex gap-1.5 items-center">
                                <button 
                                    onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} 
                                    className={classNames("flex items-center gap-1 text-[9px] font-bold px-1.5 py-1 rounded-lg border transition-all", marketInfo.colorClass)}
                                >
                                    <Repeat size={10}/>
                                    {marketInfo.name}
                                </button>
                                {isEditMode && (
                                    <button onClick={(e) => confirmDelete(e, 'ALL')} className="text-[10px] font-bold px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">전체삭제</button>
                                )}
                                <button onClick={() => setIsEditMode(!isEditMode)} className="text-[11px] font-bold text-slate-500 px-2 py-1">{isEditMode ? '완료' : '편집'}</button>
                            </div>
                        </div>
                        
                        <div className="flex border-b border-slate-800 bg-slate-900">
                            {[1, 2, 3, 4].map(id => <button key={id} onClick={() => setActiveWatchlistTab(id)} className={classNames("flex-1 py-2 text-xs font-bold", { "text-white border-b-2 border-indigo-500 bg-slate-800": activeWatchlistTab === id, "text-slate-500": activeWatchlistTab !== id })}>관심 {id}</button>)}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {displayStocks.map(s => (
                                <div key={`list-${s.code}`} className="relative group">
                                    <StockListItem stock={s} onStockClick={(st) => navigate(`/stock/${st.code}`)} onToggleFavorite={(c, e, f) => { setDisplayStocks(p => p.map(x => x.code === c ? { ...x, isFavorite: f } : x)); toggleFavorite(c, activeWatchlistTab, f); }} />
                                    {isEditMode && <button onClick={(e) => handleDeleteStock(e, s.code)} className="absolute right-12 top-1/2 -translate-y-1/2 bg-red-500/20 text-red-500 p-2 rounded-full z-20"><Trash2 size={16} /></button>}
                                </div>
                            ))}
                        </div>
                     </div>
                 </div>}
                 {activeTab === 'news' && <div className="h-full p-2 pb-24 flex flex-col"><NewsFeed news={news} /></div>}
            </div>

            {/* Mobile Detail View */}
            <div className={classNames("transition-transform duration-300 absolute inset-0 bottom-16 bg-slate-950 z-20 flex flex-col h-full", { "translate-x-0": !!stockCodeFromUrl, "translate-x-full": !stockCodeFromUrl })}>
                 <div className="flex items-center justify-between px-3 h-12 shrink-0 bg-slate-900 border-b border-slate-800">
                     <button onClick={() => navigate('/')} className="p-1 text-slate-300"><ArrowLeft size={20} /></button>
                     <button 
                        onClick={() => setShowDetailPopup(true)} 
                        className="bg-amber-200 text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-lg active:scale-95"
                     >
                        종목상세정보
                        <ChevronRight size={12} />
                     </button>
                 </div>
                 <div className="flex-1">{selectedStock && <ChartWidget stock={selectedStock} onPeriodChange={setCurrentPeriod} currentPeriod={currentPeriod} onExchangeChange={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} marketMode={globalMarketMode} />}</div>
                 {showDetailPopup && selectedStock && (
                    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900">
                             <div><h2 className="text-lg font-bold text-white">{selectedStock.name}</h2><p className="text-xs text-slate-500">{selectedStock.code} | {selectedStock.exchangeName}</p></div>
                             <button onClick={() => setShowDetailPopup(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-1"><span className="text-slate-500 text-xs">시가</span><span className="font-bold text-slate-200 text-lg">{parseFloat(selectedStock.open || 0).toLocaleString()}</span></div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-1"><span className="text-slate-500 text-xs">전일종가</span><span className="font-bold text-slate-300 text-lg">{parseFloat(selectedStock.prevClose || 0).toLocaleString()}</span></div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-1"><span className="text-trade-up opacity-80 text-xs">고가</span><span className="font-bold text-trade-up text-lg">{parseFloat(selectedStock.high || 0).toLocaleString()}</span></div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-1"><span className="text-trade-down opacity-80 text-xs">저가</span><span className="font-bold text-trade-down text-lg">{parseFloat(selectedStock.low || 0).toLocaleString()}</span></div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 col-span-2 flex justify-between items-center"><span className="text-slate-500">거래량</span><span className="font-bold text-slate-200">{parseFloat(selectedStock.volume || 0).toLocaleString()}</span></div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 col-span-2 flex justify-between items-center"><span className="text-slate-500">시가총액</span><span className="font-bold text-slate-300">{parseFloat(selectedStock.marketCap || 0).toLocaleString()} 억</span></div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 col-span-2 flex justify-between items-center"><span className="text-slate-500">52주 최고</span><span className="font-bold text-trade-up">{parseFloat(selectedStock.high52w || 0).toLocaleString()}</span></div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 col-span-2 flex justify-between items-center"><span className="text-slate-500">52주 최저</span><span className="font-bold text-trade-down">{parseFloat(selectedStock.low52w || 0).toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>
                 )}
            </div>
            {showMobileSearch && (
                <div className="absolute top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 p-4 z-50 shadow-2xl">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="종목 검색..." className="w-full bg-slate-950 border border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none" value={searchKeyword} onChange={(e) => handleSearch(e.target.value)} autoFocus /></div>
                        <button onClick={() => setShowMobileSearch(false)} className="text-sm text-indigo-400 font-bold px-2">취소</button>
                    </div>
                    {searchResults.length > 0 && <div className="mt-2 max-h-60 overflow-y-auto bg-slate-900 rounded-xl border border-slate-800 shadow-2xl">{searchResults.map(s => <div key={s.code} onClick={() => handleSearchResultClick(s)} className="p-4 border-b border-slate-800 last:border-0 flex justify-between items-center active:bg-slate-800"><div><div className="font-bold text-slate-200">{s.name}</div><div className="text-xs text-slate-500">{s.code}</div></div><Plus size={18} className="text-indigo-400" /></div>)}</div>}
                </div>
            )}
            <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-500" size={24} /></div>
                        <h3 className="text-lg font-bold text-white mb-2">{deleteTarget === 'ALL' ? `전체 삭제` : '관심종목 삭제'}</h3>
                        <p className="text-sm text-slate-400 mb-6">{deleteTarget === 'ALL' ? `관심 그룹의 모든 종목을 삭제하시겠습니까?` : '선택한 종목을 삭제하시겠습니까?'}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">취소</button>
                            <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl">삭제</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

export default Dashboard;
