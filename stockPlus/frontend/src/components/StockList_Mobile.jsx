import React from 'react';
import StockListItem from './StockListItem';
import classNames from 'classnames';
import { Plus, Trash2, Repeat, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StockListMobile = (props) => {
    const { 
        stocks: displayStocks, isLoading, isEditMode, setIsEditMode, 
        activeWatchlistTab, setActiveWatchlistTab, globalMarketMode, 
        setGlobalMarketMode, onToggleFavorite, onDeleteStock, onDeleteAll, logic 
    } = props;
    
    const { localSearchKeyword, searchResults, handleSearch, handleSearchResultClick } = logic;
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-full bg-slate-900">
            {/* 툴바 섹션 */}
            <div className="p-4 border-b border-slate-800 bg-slate-850 space-y-4">
                <div className="flex justify-between items-center">
                    {/* 그룹 탭 */}
                    <div className="flex border-slate-700 bg-slate-950 rounded-lg p-1">
                        {[1, 2, 3, 4].map(tabId => (
                            <button 
                                key={tabId} 
                                onClick={() => setActiveWatchlistTab(tabId)} 
                                className={classNames("px-4 py-1.5 text-xs font-bold rounded-md transition-all", { 
                                    "bg-indigo-600 text-white shadow-lg": activeWatchlistTab === tabId, 
                                    "text-slate-500 hover:text-slate-300": activeWatchlistTab !== tabId 
                                })}
                            >
                                관심 {tabId}
                            </button>
                        ))}
                    </div>
                    {/* 기능 버튼 */}
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setGlobalMarketMode(m => m === 'J' ? 'NX' : (m === 'NX' ? 'UN' : 'J'))} 
                            className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded bg-slate-800 text-indigo-400 border border-slate-700 hover:bg-slate-700 transition-colors"
                        >
                            <Repeat size={12} />
                            {globalMarketMode === 'J' ? 'KRX' : (globalMarketMode === 'NX' ? 'NXT' : 'UN')}
                        </button>
                        {isEditMode && (
                            <button 
                                onClick={onDeleteAll} 
                                className="text-xs font-bold px-3 py-1.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                            >
                                <Trash2 size={12} />
                                전체삭제
                            </button>
                        )}
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)} 
                            className={classNames("text-xs font-bold px-3 py-1.5 rounded transition-colors", { 
                                "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30": isEditMode, 
                                "bg-slate-800 text-slate-400 border border-slate-700": !isEditMode 
                            })}
                        >
                            {isEditMode ? '완료' : '편집'}
                        </button>
                    </div>
                </div>

                {/* 검색창 */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="종목 검색 및 추가..." 
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all shadow-inner" 
                        value={localSearchKeyword} 
                        onChange={(e) => handleSearch(e.target.value)} 
                    />
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

            {/* 목록 영역 */}
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
                                <StockListItem 
                                    stock={stock} 
                                    onStockClick={(s) => navigate(`/stock/${s.code}`)} 
                                    onToggleFavorite={onToggleFavorite} 
                                />
                                {isEditMode && (
                                    <button 
                                        onClick={(e) => onDeleteStock(e, stock.code)} 
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white p-2 rounded-lg z-10 transition-all shadow-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
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
        </div>
    );
};

export default StockListMobile;
