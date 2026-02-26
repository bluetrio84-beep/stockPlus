import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWatchlist, addToWatchlist, deleteFromWatchlist, deleteAllFromWatchlist, searchStocks, fetchStockChart, fetchStockPrice, fetchRecentNews, fetchMarketInsight, fetchSpecialReport, toggleFavorite, fetchTopRankings } from '../api/stockApi';
import classNames from 'classnames';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import Dashboard_Desktop from './Dashboard_Desktop';
import Dashboard_Mobile from './Dashboard_Mobile';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation(); // [v13.9] URL 파라미터 확인용 추가
  const { stockCode: stockCodeFromUrl } = useParams();

  const [displayStocks, setDisplayStocks] = useState([]);
  const [news, setNews] = useState([]);
  const [marketInsight, setMarketInsight] = useState('');
  const [specialReport, setSpecialReport] = useState('');
  const [rankings, setRankings] = useState([]); // [v13.5] 랭킹 상태 추가
  const [selectedStock, setSelectedStock] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  
  // [v13.9] URL 파라미터 기반 탭 설정 로직
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tab = queryParams.get('tab');
    if (tab === 'ai') {
      setActiveTab('ai');
    } else if (tab === 'watchlist') {
      setActiveTab('watchlist');
    }
  }, [location]);

  const [watchlistSubTab, setWatchlistSubTab] = useState('list');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [globalMarketMode, setGlobalMarketMode] = useState('UN');
  const [activeWatchlistTab, setActiveWatchlistTab] = useState(1);
  const [currentPeriod, setCurrentPeriod] = useState('1D');
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeoutRef = useRef(null);
  const stockUpdatesBuffer = useRef(new Map());

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
              <span className="text-white font-semibold text-[13px]">{line.replace(/^\d+\./, '').trim()}</span>
            </div>
          ) : (
            <span className="text-slate-100 text-[13px]">{line}</span>
          )}
        </div>
      );
    });
  };

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
                ...w, 
                id: w.stockCode,
                code: w.stockCode,
                name: w.stockName,
                marketType: w.marketType, 
                stockStatus: priceData?.stockStatus,
                marketWarning: priceData?.marketWarning,
                marketName: priceData?.marketName,
                indexName: priceData?.indexName,
                exchangeCode: market, 
                exchangeName: market === 'NX' ? 'NXT' : (market === 'UN' ? 'UN' : 'KRX'),
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
    if (selectedStock) setSelectedStock(prev => ({ ...prev, exchangeCode: globalMarketMode }));
  }, [globalMarketMode]);

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
        fetchTopRankings().then(setRankings).catch(() => {}); // [v13.5] 랭킹 로드
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

  const confirmDelete = (e, target) => {
      if (e) e.stopPropagation();
      setDeleteTarget(target);
      setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
      try {
          if (deleteTarget === 'ALL') await deleteAllFromWatchlist(activeWatchlistTab);
          else if (deleteTarget) await deleteFromWatchlist(deleteTarget, activeWatchlistTab);
          await loadWatchlist(globalMarketMode, activeWatchlistTab);
      } catch (err) {} finally { setShowDeleteConfirm(false); setDeleteTarget(null); }
  };

  const handleToggleFavorite = (stockCode, exchangeCode, isFav) => {
      setDisplayStocks(prev => prev.map(x => x.code === stockCode ? { ...x, isFavorite: isFav } : x));
      toggleFavorite(stockCode, activeWatchlistTab, isFav);
  };

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-slate-950">
        <Dashboard_Desktop 
            displayStocks={displayStocks} selectedStock={selectedStock} marketInsight={marketInsight} news={news} rankings={rankings}
            searchKeyword={searchKeyword} searchResults={searchResults} isEditMode={isEditMode} globalMarketMode={globalMarketMode}
            activeWatchlistTab={activeWatchlistTab} currentPeriod={currentPeriod} handleSearch={handleSearch}
            handleSearchResultClick={handleSearchResultClick} confirmDelete={confirmDelete} setGlobalMarketMode={setGlobalMarketMode}
            setIsEditMode={setIsEditMode} setActiveWatchlistTab={setActiveWatchlistTab} setCurrentPeriod={setCurrentPeriod}
            renderFormattedText={renderFormattedText} navigate={navigate} onToggleFavorite={handleToggleFavorite}
        />
        <Dashboard_Mobile 
            activeTab={activeTab} setActiveTab={setActiveTab} watchlistSubTab={watchlistSubTab} setWatchlistSubTab={setWatchlistSubTab}
            marketInsight={marketInsight} displayStocks={displayStocks} rankings={rankings} isEditMode={isEditMode}
            searchKeyword={searchKeyword} searchResults={searchResults} showMobileSearch={showMobileSearch} setShowMobileSearch={setShowMobileSearch}
            selectedStock={selectedStock} currentPeriod={currentPeriod} showDetailPopup={showDetailPopup} setShowDetailPopup={setShowDetailPopup}
            specialReport={specialReport} news={news} globalMarketMode={globalMarketMode} activeWatchlistTab={activeWatchlistTab}
            stockCodeFromUrl={stockCodeFromUrl} handleSearch={handleSearch} handleSearchResultClick={handleSearchResultClick}
            confirmDelete={confirmDelete} setGlobalMarketMode={setGlobalMarketMode} setIsEditMode={setIsEditMode}
            setActiveWatchlistTab={setActiveWatchlistTab} setCurrentPeriod={setCurrentPeriod} navigate={navigate}
            renderFormattedText={renderFormattedText} onToggleFavorite={handleToggleFavorite}
        />
        {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-6">
                    <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="text-red-500" size={24} /></div>
                    <h3 className="text-lg font-bold text-white mb-2">{deleteTarget === 'ALL' ? `전체 삭제` : '관심종목 삭제'}</h3>
                    <p className="text-sm text-slate-400 mb-6">{deleteTarget === 'ALL' ? `관심 그룹의 모든 종목을 삭제하시겠습니까?` : '선택한 종목을 삭제하시겠습니까?'}</p>
                    <div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl">취소</button><button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl">삭제</button></div>
                </div>
            </div>
        )}
    </div>
  );
}

export default Dashboard;
