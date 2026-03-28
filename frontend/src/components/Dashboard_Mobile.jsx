import React from 'react';
import StockListItem from './StockListItem';
import ChartWidget from './ChartWidget';
import NewsFeed from './NewsFeed';
import MobileNav from './MobileNav';
import { getSignSymbol, getColorClass, getMarketDisplay, getStockStatusBadge, isKosdaq } from '../utils/stockUtils';
import classNames from 'classnames';
import { X, Plus, Trash2, Repeat, Search, Sparkles, ArrowLeft, Brain, ChevronRight, Star, TrendingUp } from 'lucide-react';

const Dashboard_Mobile = ({
    activeTab, setActiveTab, watchlistSubTab, setWatchlistSubTab, marketInsight, displayStocks,
    rankings, 
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
                     <div className="flex-1 flex flex-col bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl overflow-hidden shadow-xl mb-0 transition-colors duration-500">
                        <div className="flex border-b border-[var(--theme-border)] bg-[var(--theme-header)] transition-colors duration-500">
                            <button 
                                onClick={() => setWatchlistSubTab('list')} 
                                className={classNames("flex-1 py-3 text-sm font-black transition-all border-b-2", { 
                                    "border-[var(--theme-point)] text-[var(--theme-text)] bg-[var(--theme-bg)]/50": watchlistSubTab === 'list', 
                                    "border-transparent text-slate-500": watchlistSubTab !== 'list' 
                                })}
                            >
                                관심종목시세
                            </button>
                            <button 
                                onClick={() => setWatchlistSubTab('ai')} 
                                className={classNames("flex-1 py-3 text-sm font-black transition-all border-b-2", { 
                                    "border-[var(--theme-point)] text-[var(--theme-text)] bg-[var(--theme-bg)]/50": watchlistSubTab === 'ai', 
                                    "border-transparent text-slate-500": watchlistSubTab !== 'ai' 
                                })}
                            >
                                AI 분석
                            </button>
                        </div>
                        {watchlistSubTab === 'list' ? (
                            <div className="h-full p-4 overflow-y-auto custom-scrollbar transition-colors duration-500">
                                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl p-4 mb-6 shadow-sm transition-colors duration-500">
                                    <h3 className="text-xs font-black text-slate-500 mb-3 flex items-center gap-2"><Sparkles size={14} className="text-yellow-600"/> AI Market Insight</h3>
                                    {renderFormattedText(marketInsight)}
                                </div>
                                <h3 className="font-black text-[var(--theme-text)] opacity-80 mb-3 px-1 flex items-center gap-2 transition-colors"><Star size={16} className="text-yellow-500 fill-yellow-500" /> 주요 관심 종목</h3>
                                <div className="space-y-3">
                                    {displayStocks.filter(s => s.isFavorite).length > 0 ? displayStocks.filter(s => s.isFavorite).map(stock => {
                                        const badge = getStockStatusBadge(stock);
                                        return (
                                            <div key={`home-${stock.code}`} onClick={() => navigate(`/stock/${stock.code}`)} className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl p-4 flex justify-between items-center active:bg-[var(--theme-bg)] transition-all shadow-sm transition-colors duration-500">
                                                <div>
                                                    <div className="font-black text-[var(--theme-text)] text-base flex items-center gap-1.5 transition-colors">
                                                        {stock.name}
                                                        {isKosdaq(stock) && <span className="text-[var(--theme-point)]">*</span>}
                                                        {badge && <span className={classNames("text-[10px] px-1 rounded border leading-tight", badge.color)}>{badge.label}</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-bold">{stock.code} | {stock.exchangeName}</div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className={classNames("text-xl font-black tabular-nums tracking-tight", getColorClass(stock.priceSign, stock.change))}>
                                                        {stock.price.toLocaleString()}
                                                    </div>
                                                    <div className={classNames("text-xs font-black", getColorClass(stock.priceSign, stock.change))}>
                                                        {getSignSymbol(stock.priceSign, stock.change)} {Math.abs(stock.changeRate).toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : <div className="flex flex-col items-center justify-center py-10 text-slate-600 bg-[var(--theme-header)] rounded-xl border border-dashed border-[var(--theme-border)] transition-colors duration-500"><Star size={32} className="mb-2 opacity-10" /><p className="text-xs">즐겨찾기한 종목이 없습니다.</p></div>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl overflow-hidden shadow-2xl relative transition-colors duration-500">
                                <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-point)]/5 to-purple-500/5 pointer-events-none"></div>
                                <div className="p-4 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex items-center gap-3 relative z-10 shrink-0 transition-colors duration-500 shadow-sm">
                                    <div className="p-2 bg-[var(--theme-point)]/10 rounded-lg"><Brain className="text-[var(--theme-point)]" size={20} /></div>
                                    <div>
                                        <h3 className="font-black text-[var(--theme-text)] text-base transition-colors">전담 AI 분석가 리포트</h3>
                                        <p className="text-[10px] text-[var(--theme-point)] font-black uppercase tracking-wider">Strategic Analysis</p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-5 pb-12 custom-scrollbar relative z-10 break-words font-sans text-[13px] leading-relaxed transition-colors">
                                    {specialReport ? (
                                        <div className="transition-colors">
                                            {renderFormattedText(specialReport)}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                            <Sparkles size={40} className="mb-4 opacity-10 animate-pulse" />
                                            <p className="text-[13px] font-black uppercase tracking-widest transition-colors">Analyzing Market Data...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                     </div>
                 </div>}

                 {/* 2. 종목검색 탭 (watchlist) */}
                 {activeTab === 'watchlist' && <div className="h-full p-1.5 pb-15 flex flex-col relative">
                     <div className="flex-1 flex flex-col bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl overflow-hidden shadow-xl transition-colors duration-500">
                        <div className="p-3 bg-[var(--theme-header)] flex items-center justify-between border-b border-[var(--theme-border)] transition-colors duration-500">
                            <div className="flex items-center gap-2">
                                <span className="font-black text-[var(--theme-text)] opacity-80 shrink-0 transition-colors">관심 종목</span>
                                <button onClick={() => setShowMobileSearch(true)} className="p-1.5 text-slate-500 hover:text-[var(--theme-point)] transition-colors">
                                    <Search size={18} />
                                </button>
                            </div>
                            <div className="flex gap-1.5 items-center">
                                <button onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} className={classNames("flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg border transition-all shadow-sm", marketInfo.colorClass.replace('600/10', '600/20'))}><Repeat size={10}/>{marketInfo.name}</button>
                                {isEditMode && <button onClick={(e) => confirmDelete(e, 'ALL')} className="text-[10px] font-black px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">전체삭제</button>}
                                <button onClick={() => setIsEditMode(!isEditMode)} className="text-[11px] font-black text-slate-500 px-2 py-1 transition-colors">{isEditMode ? '완료' : '편집'}</button>
                            </div>
                        </div>
                        <div className="flex border-b border-[var(--theme-border)] bg-[var(--theme-header)] transition-colors duration-500">
                            {[1, 2, 3, 4].map(id => (
                                <button 
                                    key={id} 
                                    onClick={() => setActiveWatchlistTab(id)} 
                                    className={classNames("flex-1 py-2 text-xs font-black transition-all", { 
                                        "text-[var(--theme-text)] border-b-2 border-[var(--theme-point)] bg-[var(--theme-bg)]/50": activeWatchlistTab === id, 
                                        "text-slate-500": activeWatchlistTab !== id 
                                    })}
                                >
                                    관심 {id}
                                </button>
                            ))}
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
            <div className={classNames("transition-transform duration-300 absolute inset-0 bottom-[56px] bg-[var(--theme-bg)] z-20 flex flex-col transition-colors duration-500", { "translate-x-0": !!stockCodeFromUrl, "translate-x-full": !stockCodeFromUrl })}>
                 <div className="flex items-center justify-between px-3 h-12 shrink-0 bg-[var(--theme-header)] border-b border-[var(--theme-border)] transition-colors duration-500">
                     <button onClick={() => navigate('/')} className="p-1 text-slate-400"><ArrowLeft size={20} /></button>
                     <button onClick={() => setShowDetailPopup(true)} className="bg-amber-500/20 text-amber-600 text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-sm active:scale-95 border border-amber-500/30">종목상세정보<ChevronRight size={12} /></button>
                 </div>
                 <div className="flex-1">{selectedStock && <ChartWidget stock={selectedStock} onPeriodChange={setCurrentPeriod} currentPeriod={currentPeriod} onExchangeChange={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} marketMode={globalMarketMode} />}</div>
                 {showDetailPopup && selectedStock && (
                    <div className="fixed inset-0 z-[100] bg-[var(--theme-bg)] flex flex-col animate-in slide-in-from-bottom-5 transition-colors duration-500">
                        <div className="flex justify-between items-center p-4 border-b border-[var(--theme-border)] bg-[var(--theme-header)] transition-colors duration-500">
                             <div><h2 className="text-lg font-black text-[var(--theme-text)] transition-colors">{selectedStock.name}</h2><p className="text-xs text-slate-500 font-bold">{selectedStock.code} | {selectedStock.exchangeName}</p></div>
                             <button onClick={() => setShowDetailPopup(false)} className="p-2 bg-[var(--theme-bg)] rounded-full text-slate-500 hover:text-[var(--theme-text)] transition-colors"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--theme-bg)] transition-colors duration-500">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] flex flex-col gap-1 transition-colors duration-500"><span className="text-slate-500 text-xs font-black uppercase">시가</span><span className="font-black text-[var(--theme-text)] text-lg transition-colors">{parseFloat(selectedStock.open || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] flex flex-col gap-1 transition-colors duration-500"><span className="text-slate-500 text-xs font-black uppercase">전일종가</span><span className="font-black text-[var(--theme-text)] text-lg transition-colors">{parseFloat(selectedStock.prevClose || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] flex flex-col gap-1 transition-colors duration-500"><span className="text-trade-up opacity-90 text-xs font-black uppercase">고가</span><span className="font-black text-trade-up text-lg">{parseFloat(selectedStock.high || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] flex flex-col gap-1 transition-colors duration-500"><span className="text-trade-down opacity-90 text-xs font-black uppercase">저가</span><span className="font-black text-trade-down text-lg">{parseFloat(selectedStock.low || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] col-span-2 flex justify-between items-center transition-colors duration-500"><span className="text-slate-500 text-xs font-black uppercase">거래량</span><span className="font-black text-[var(--theme-text)] transition-colors">{parseFloat(selectedStock.volume || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] col-span-2 flex justify-between items-center transition-colors duration-500"><span className="text-slate-500 text-xs font-black uppercase">시가총액</span><span className="font-black text-[var(--theme-text)] transition-colors">{parseFloat(selectedStock.marketCap || 0).toLocaleString()} 억</span></div>
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] col-span-2 flex justify-between items-center transition-colors duration-500"><span className="text-slate-500 text-xs font-black uppercase">52주 최고</span><span className="font-black text-trade-up">{parseFloat(selectedStock.high52w || 0).toLocaleString()}</span></div>
                                <div className="bg-[var(--theme-header)] p-4 rounded-xl border border-[var(--theme-border)] col-span-2 flex justify-between items-center transition-colors duration-500"><span className="text-slate-500 text-xs font-black uppercase">52주 최저</span><span className="font-black text-trade-down">{parseFloat(selectedStock.low52w || 0).toLocaleString()}</span></div>
                            </div>
                        </div>
                    </div>
                 )}
            </div>
            {showMobileSearch && (
                <div className="absolute top-0 left-0 right-0 bg-[var(--theme-header)] border-b border-[var(--theme-border)] p-4 z-50 shadow-2xl transition-colors duration-500">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input type="text" placeholder="종목 검색..." className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-full py-2.5 pl-10 pr-4 text-sm text-[var(--theme-text)] font-black placeholder:text-slate-600 focus:outline-none transition-colors duration-500" value={searchKeyword} onChange={(e) => handleSearch(e.target.value)} autoFocus />
                        </div>
                        <button onClick={() => setShowMobileSearch(false)} className="text-sm text-[var(--theme-point)] font-black px-2">취소</button>
                    </div>
                    {searchResults.length > 0 && <div className="mt-2 max-h-60 overflow-y-auto bg-[var(--theme-header)] rounded-xl border border-[var(--theme-border)] shadow-2xl transition-colors duration-500">{searchResults.map(s => <div key={s.code} onClick={() => handleSearchResultClick(s)} className="p-4 border-b border-[var(--theme-border)] last:border-0 flex justify-between items-center active:bg-[var(--theme-bg)] transition-colors"><div><div className="font-black text-[var(--theme-text)] transition-colors">{s.name}</div><div className="text-xs text-slate-500 font-bold">{s.code}</div></div><Plus size={18} className="text-[var(--theme-point)]" /></div>)}</div>}
                </div>
            )}
            <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
};

export default Dashboard_Mobile;
