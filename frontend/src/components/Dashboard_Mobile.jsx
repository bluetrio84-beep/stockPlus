import React from 'react';
import StockListItem from './StockListItem';
import ChartWidget from './ChartWidget';
import NewsFeed from './NewsFeed';
import MobileNav from './MobileNav';
import { getSignSymbol, getColorClass, getMarketDisplay, getStockStatusBadge, isKosdaq } from '../utils/stockUtils';
import classNames from 'classnames';
import { X, Plus, Trash2, Repeat, Search, Sparkles, ArrowLeft, Brain, ChevronRight, Star, TrendingUp } from 'lucide-react'; // [수정] TrendingUp 추가

const Dashboard_Mobile = ({
    activeTab, setActiveTab, watchlistSubTab, setWatchlistSubTab, marketInsight, displayStocks,
    rankings, // [추가] rankings prop 받기
    isEditMode, searchKeyword, searchResults, showMobileSearch, setShowMobileSearch, selectedStock,
    currentPeriod, showDetailPopup, setShowDetailPopup, specialReport, news, globalMarketMode, activeWatchlistTab, stockCodeFromUrl,
    handleSearch, handleSearchResultClick, handleDeleteStock, confirmDelete, setGlobalMarketMode, setIsEditMode,
    setActiveWatchlistTab, setCurrentPeriod, navigate, renderFormattedText, onToggleFavorite
}) => {
    const marketInfo = getMarketDisplay(globalMarketMode);

    return (
        <div className="lg:hidden flex-1 overflow-hidden relative h-full"> 
            <div className={classNames("transition-transform duration-300 absolute inset-0 bottom-[56px] bg-[var(--theme-bg)] transition-colors duration-500 z-10 h-full", { "translate-x-0": !stockCodeFromUrl, "-translate-x-full": !!stockCodeFromUrl })}>
                 {/* 1. 관심종목요약 탭 (home) */}
                 {activeTab === 'home' && <div className="h-full p-1.5 pb-15 flex flex-col relative">
                     <div className="flex-1 flex flex-col bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl overflow-hidden shadow-xl mb-0">
                        <div className="flex border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500">
                            <button onClick={() => setWatchlistSubTab('list')} className={classNames("flex-1 py-3 text-sm font-bold transition-all border-b-2", { "border-indigo-500 text-white bg-slate-800/50": watchlistSubTab === 'list', "border-transparent text-slate-500": watchlistSubTab !== 'list' })}>관심종목시세</button>
                            <button onClick={() => setWatchlistSubTab('ai')} className={classNames("flex-1 py-3 text-sm font-bold transition-all border-b-2", { "border-indigo-500 text-white bg-slate-800/50": watchlistSubTab === 'ai', "border-transparent text-slate-500": watchlistSubTab !== 'ai' })}>AI 분석</button>
                        </div>
                        {watchlistSubTab === 'list' ? (
                            <div className="h-full p-4 overflow-y-auto custom-scrollbar">
                                {/* [v13.5] 실시간 시장 주도주 랭킹 칩 (주석 처리)
                                {rankings && rankings.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
                                        {rankings.map((r, i) => (
                                            <div key={i} onClick={() => navigate(`/stock/${r.stock_code}`)} className="flex-none bg-slate-800/50 border border-[var(--theme-border)] transition-colors duration-500/50 px-3 py-1.5 rounded-full flex items-center gap-2 active:bg-slate-700 transition-colors shadow-sm">
                                                <span className={classNames("text-[10px] font-black", r.type === 'AMOUNT' ? "text-amber-500" : "text-rose-500")}>
                                                    {r.type === 'AMOUNT' ? '●' : '▲'}
                                                </span>
                                                <span className="text-[11px] font-bold text-slate-200 whitespace-nowrap">{r.stock_name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                */}

                                <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl p-4 mb-6">
                                    <h3 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2"><Sparkles size={14} className="text-yellow-500"/> AI Market Insight</h3>
                                    {renderFormattedText(marketInsight)}
                                </div>
                                <h3 className="font-bold text-slate-300 mb-3 px-1 flex items-center gap-2"><Star size={16} className="text-yellow-500 fill-yellow-500" /> 주요 관심 종목</h3>
                                <div className="space-y-3">
                                    {displayStocks.filter(s => s.isFavorite).length > 0 ? displayStocks.filter(s => s.isFavorite).map(stock => {
                                        const badge = getStockStatusBadge(stock);
                                        return (
                                            <div key={`home-${stock.code}`} onClick={() => navigate(`/stock/${stock.code}`)} className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl p-4 flex justify-between items-center active:bg-slate-800 transition-colors shadow-sm">
                                                <div>
                                                    <div className="font-bold text-slate-200 text-base flex items-center gap-1.5">
                                                        {stock.name}
                                                        {isKosdaq(stock) && <span className="text-indigo-400">*</span>}
                                                        {badge && <span className={classNames("text-[10px] px-1 rounded border", badge.color)}>{badge.label}</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">{stock.code} | {stock.exchangeName}</div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className={classNames("text-xl font-bold", getColorClass(stock.priceSign, stock.change))}>
                                                        {stock.price.toLocaleString()}
                                                    </div>
                                                    <div className={classNames("text-xs font-medium", getColorClass(stock.priceSign, stock.change))}>
                                                        {getSignSymbol(stock.priceSign, stock.change)} {Math.abs(stock.changeRate).toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-[var(--theme-header)] transition-colors duration-500/50 rounded-xl border border-dashed border-[var(--theme-border)] transition-colors duration-500"><Star size={32} className="mb-2 opacity-10" /><p className="text-xs">즐겨찾기한 종목이 없습니다.</p></div>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-[var(--theme-header)] transition-colors duration-500">
                                <div className="p-4 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500 flex items-center gap-3"><div className="p-2 bg-indigo-500/20 rounded-lg"><Brain className="text-indigo-400" size={20} /></div><div><h3 className="font-black !text-white text-base">전담 AI 분석가 리포트</h3><p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Strategic Analysis</p></div></div>
                                <div className="flex-1 overflow-y-auto p-5 pb-12 custom-scrollbar bg-[var(--theme-bg)] transition-colors duration-500/50 break-words">{renderFormattedText(specialReport) || <div className="flex flex-col items-center justify-center h-full text-slate-600"><Sparkles size={40} className="mb-4 opacity-10 animate-pulse" /><p className="text-sm font-medium">분석 리포트를 생성하고 있습니다...</p></div>}</div>
                            </div>
                        )}
                     </div>
                 </div>}

                 {/* 2. 종목검색 탭 (watchlist) */}
                 {activeTab === 'watchlist' && <div className="h-full p-1.5 pb-15 flex flex-col relative">
                     <div className="flex-1 flex flex-col bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl overflow-hidden shadow-xl">
                        <div className="p-3 bg-[var(--theme-header)] transition-colors duration-500 flex items-center justify-between border-b border-[var(--theme-border)] transition-colors duration-500">
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
                        
                        <div className="flex border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500">
                            {[1, 2, 3, 4].map(id => <button key={id} onClick={() => setActiveWatchlistTab(id)} className={classNames("flex-1 py-2 text-xs font-bold", { "text-white border-b-2 border-indigo-500 bg-slate-800": activeWatchlistTab === id, "text-slate-500": activeWatchlistTab !== id })}>관심 {id}</button>)}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {displayStocks.map(s => (
                                <div key={`list-${s.code}`} className="relative group">
                                    <StockListItem stock={s} onStockClick={(st) => navigate(`/stock/${st.code}`)} onToggleFavorite={onToggleFavorite} />
                                    {isEditMode && <button onClick={(e) => handleDeleteStock(e, s.code)} className="absolute right-12 top-1/2 -translate-y-1/2 bg-red-500/20 text-red-500 p-2 rounded-full z-20"><Trash2 size={16} /></button>}
                                </div>
                            ))}
                        </div>
                     </div>
                 </div>}
                 {activeTab === 'news' && <div className="h-full p-1.5 pb-15 flex flex-col bg-[var(--theme-bg)] transition-colors duration-500"><NewsFeed news={news} /></div>}
            </div>

            {/* Mobile Detail View */}
            <div className={classNames("transition-transform duration-300 absolute inset-0 bottom-[56px] bg-[var(--theme-bg)] transition-colors duration-500 z-20 flex flex-col", { "translate-x-0": !!stockCodeFromUrl, "translate-x-full": !stockCodeFromUrl })}>
                 <div className="flex items-center justify-between px-3 h-12 shrink-0 bg-[var(--theme-header)] transition-colors duration-500 border-b border-[var(--theme-border)] transition-colors duration-500">
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
                    <div className="fixed inset-0 z-[100] bg-[var(--theme-bg)] transition-colors duration-500 flex flex-col animate-in slide-in-from-bottom-5">
                        <div className="flex justify-between items-center p-4 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500">
                             <div><h2 className="text-lg font-bold text-white">{selectedStock.name}</h2><p className="text-xs text-slate-500">{selectedStock.code} | {selectedStock.exchangeName}</p></div>
                             <button onClick={() => setShowDetailPopup(false)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--theme-bg)] transition-colors duration-500">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex flex-col gap-1"><span className="text-slate-500 text-xs">시가</span><span className="font-bold text-slate-200 text-lg">{parseFloat(selectedStock.open || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex flex-col gap-1"><span className="text-slate-500 text-xs">전일종가</span><span className="font-bold text-slate-300 text-lg">{parseFloat(selectedStock.prevClose || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex flex-col gap-1"><span className="text-trade-up opacity-80 text-xs">고가</span><span className="font-bold text-trade-up text-lg">{parseFloat(selectedStock.high || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 flex flex-col gap-1"><span className="text-trade-down opacity-80 text-xs">저가</span><span className="font-bold text-trade-down text-lg">{parseFloat(selectedStock.low || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 col-span-2 flex justify-between items-center"><span className="text-slate-500">거래량</span><span className="font-bold text-slate-200">{parseFloat(selectedStock.volume || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 col-span-2 flex justify-between items-center"><span className="text-slate-500">시가총액</span><span className="font-bold text-slate-300">{parseFloat(selectedStock.marketCap || 0).toLocaleString()} 억</span></div>
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 col-span-2 flex justify-between items-center"><span className="text-slate-500">52주 최고</span><span className="font-bold text-trade-up">{parseFloat(selectedStock.high52w || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] transition-colors duration-500 p-4 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 col-span-2 flex justify-between items-center"><span className="text-slate-500">52주 최저</span><span className="font-bold text-trade-down">{parseFloat(selectedStock.low52w || 0).toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>
                 )}
            </div>
            {showMobileSearch && (
                <div className="absolute top-0 left-0 right-0 bg-[var(--theme-header)] transition-colors duration-500 border-b border-[var(--theme-border)] transition-colors duration-500 p-4 z-50 shadow-2xl">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="종목 검색..." className="w-full bg-[var(--theme-bg)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none" value={searchKeyword} onChange={(e) => handleSearch(e.target.value)} autoFocus /></div>
                        <button onClick={() => setShowMobileSearch(false)} className="text-sm text-indigo-400 font-bold px-2">취소</button>
                    </div>
                    {searchResults.length > 0 && <div className="mt-2 max-h-60 overflow-y-auto bg-[var(--theme-header)] transition-colors duration-500 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 shadow-2xl">{searchResults.map(s => <div key={s.code} onClick={() => handleSearchResultClick(s)} className="p-4 border-b border-[var(--theme-border)] transition-colors duration-500 last:border-0 flex justify-between items-center active:bg-slate-800"><div><div className="font-bold text-slate-200">{s.name}</div><div className="text-xs text-slate-500">{s.code}</div></div><Plus size={18} className="text-indigo-400" /></div>)}</div>}
                </div>
            )}
            <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
};

export default Dashboard_Mobile;
