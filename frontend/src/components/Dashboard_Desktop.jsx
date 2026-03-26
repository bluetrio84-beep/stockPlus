import React from 'react';
import StockListItem from './StockListItem';
import ChartWidget from './ChartWidget';
import NewsFeed from './NewsFeed';
import { getMarketDisplay } from '../utils/stockUtils';
import classNames from 'classnames';
import { Plus, Trash2, Repeat, Search, Sparkles } from 'lucide-react';

const Dashboard_Desktop = ({
    displayStocks, selectedStock, marketInsight, news, rankings, // [추가] rankings 누락분 보충
    searchKeyword, searchResults, isEditMode, globalMarketMode, activeWatchlistTab, currentPeriod,
    handleSearch, handleSearchResultClick, confirmDelete, setGlobalMarketMode, setIsEditMode,
    setActiveWatchlistTab, setCurrentPeriod, navigate, renderFormattedText, onToggleFavorite 
}) => {
    const marketInfo = getMarketDisplay(globalMarketMode);

    return (
        <div className="hidden lg:grid grid-cols-12 gap-4 p-4 flex-1 h-full overflow-hidden">
            <div className="col-span-3 h-full flex flex-col bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl overflow-hidden transition-colors duration-500">
                <div className="p-3 border-b border-[var(--theme-border)] bg-[var(--theme-header)] space-y-3">
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
                        <input type="text" placeholder="종목 검색..." className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none" value={searchKeyword} onChange={(e) => handleSearch(e.target.value)} />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                                {searchResults.map(s => <div key={s.code} onClick={() => handleSearchResultClick(s)} className="p-2.5 hover:bg-[var(--theme-bg)] cursor-pointer border-b border-[var(--theme-border)] flex justify-between items-center group"><div><div className="font-bold text-slate-200 text-xs group-hover:text-indigo-400">{s.name}</div><div className="text-[10px] text-slate-500">{s.code}</div></div><Plus size={14} className="text-slate-500" /></div>)}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex border-b border-[var(--theme-border)] bg-[var(--theme-header)]">
                    {[1, 2, 3, 4].map(id => <button key={id} onClick={() => setActiveWatchlistTab(id)} className={classNames("flex-1 py-2 text-xs font-bold transition-all", { "text-white border-b-2 border-indigo-500 bg-[var(--theme-bg)]/50": activeWatchlistTab === id, "text-slate-500 hover:text-slate-300": activeWatchlistTab !== id })}>관심 {id}</button>)}
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
                    <div className="p-3 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex items-center gap-2"><Sparkles className="text-yellow-400" size={18} /><h3 className="font-bold text-slate-200 text-sm">AI Market Insight</h3></div>
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
