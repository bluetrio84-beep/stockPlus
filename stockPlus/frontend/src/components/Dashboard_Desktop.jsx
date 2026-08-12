import React from 'react';
import StockListItem from './StockListItem';
import ChartWidget from './ChartWidget';
import NewsFeed from './NewsFeed';
import { getMarketDisplay } from '../utils/stockUtils';
import classNames from 'classnames';
import { Plus, Trash2, Repeat, Search, Sparkles, RefreshCw } from 'lucide-react';

const Dashboard_Desktop = ({
    displayStocks, selectedStock, marketInsight, news, rankings, // [추가] rankings 누락분 보충
    searchKeyword, searchResults, isEditMode, globalMarketMode, activeWatchlistTab, currentPeriod,
    handleSearch, handleSearchResultClick, confirmDelete, setGlobalMarketMode, setIsEditMode,
    setActiveWatchlistTab, setCurrentPeriod, navigate, renderFormattedText, onToggleFavorite,
    onRefreshInsight, isRefreshingInsight
}) => {
    const marketInfo = getMarketDisplay(globalMarketMode);

    return (
        <div className="hidden lg:grid grid-cols-12 gap-4 h-full p-4 overflow-hidden">
            <div className="col-span-3 h-full flex flex-col bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl shadow-xl overflow-hidden">
                <div className="p-3 border-b border-[var(--theme-border)] flex items-center justify-between">
                    <h2 className="font-bold text-[var(--theme-text)] transition-colors">관심종목</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditMode(!isEditMode)} className={classNames("p-1.5 rounded-lg text-xs font-bold transition-all", { "bg-red-500 text-white": isEditMode, "bg-slate-800 text-slate-400 hover:text-white": !isEditMode })}>
                            {isEditMode ? '완료' : '편집'}
                        </button>
                        {isEditMode && <button onClick={(e) => confirmDelete(e, 'ALL')} className="p-1.5 bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-colors">전체삭제</button>}
                    </div>
                </div>
                <div className="p-2 border-b border-[var(--theme-border)] relative">
                    <div className="relative">
                        <input type="text" value={searchKeyword} onChange={(e) => handleSearch(e.target.value)} placeholder="종목명 또는 코드 검색..." className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] text-sm px-3 py-2 pr-8 rounded-lg border border-[var(--theme-border)] focus:outline-none focus:border-indigo-500 transition-colors" />
                        <Search className="absolute right-2.5 top-2.5 text-slate-500" size={16} />
                    </div>
                    {searchResults.length > 0 && (
                        <div className="absolute left-2 right-2 top-full mt-1 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                            {searchResults.map(s => (
                                <div key={s.code} onClick={() => handleSearchResultClick(s)} className="p-2.5 hover:bg-[var(--theme-bg)] cursor-pointer flex items-center justify-between border-b border-[var(--theme-border)]/50 last:border-0">
                                    <div>
                                        <div className="font-bold text-xs text-[var(--theme-text)]">{s.name}</div>
                                        <div className="text-[10px] text-slate-500">{s.code}</div>
                                    </div>
                                    <Plus className="text-indigo-400" size={14} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex border-b border-[var(--theme-border)] bg-[var(--theme-header)]/30">
                    {[1, 2, 3, 4].map(id => <button key={id} onClick={() => setActiveWatchlistTab(id)} className={classNames("flex-1 py-2 text-xs font-bold transition-all", { "text-[var(--theme-text)] border-b-2 border-indigo-500 bg-[var(--theme-bg)]/50": activeWatchlistTab === id, "text-slate-500 hover:text-[var(--theme-text)]": activeWatchlistTab !== id })}>관심 {id}</button>)}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {displayStocks.map(s => (
                        <div key={`${s.code}-${s.exchangeCode}`} className="relative group">
                            <StockListItem stock={s} isSelected={selectedStock?.code === s.code} onStockClick={(st) => navigate(`/stock/${st.code}`)} onToggleFavorite={onToggleFavorite} />
                            {isEditMode && <button onClick={(e) => confirmDelete(e, s.code)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500/20 text-red-500 p-1.5 rounded-full z-10 transition-colors"><Trash2 size={14} /></button>}
                        </div>
                    ))}
                </div>
            </div>
            <div className="col-span-6 h-full flex flex-col overflow-hidden">
                 {selectedStock ? <ChartWidget stock={selectedStock} onPeriodChange={setCurrentPeriod} currentPeriod={currentPeriod} onExchangeChange={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} marketMode={globalMarketMode} /> : <div className="h-full flex flex-col items-center justify-center bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl text-slate-500"><Search size={48} className="mb-4 opacity-20" /><p>종목을 선택하세요.</p></div>}
            </div>
            <div className="col-span-3 h-full flex flex-col gap-4 overflow-hidden">
                <div className="h-[35%] bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl shadow-xl overflow-hidden flex flex-col">
                    <div className="p-3 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-yellow-400" size={18} />
                            <h3 className="font-bold text-[var(--theme-text)] text-sm transition-colors">AI Market Insight</h3>
                        </div>
                        {onRefreshInsight && (
                            <button
                                onClick={onRefreshInsight}
                                disabled={isRefreshingInsight}
                                title="Gemini 3.5 Flash 즉시 새로고침"
                                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isRefreshingInsight ? 'animate-spin text-amber-400' : ''} />
                            </button>
                        )}
                    </div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-[var(--theme-header)]">
                        {renderFormattedText(marketInsight) || <div className="text-slate-500 text-sm italic">요약을 불러오는 중입니다...</div>}
                    </div>
                </div>
                <div className="flex-1 min-h-0 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl shadow-xl overflow-hidden"><NewsFeed news={news} /></div>
            </div>
        </div>
    );
};

export default Dashboard_Desktop;
