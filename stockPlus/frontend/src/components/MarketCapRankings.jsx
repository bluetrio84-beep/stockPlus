import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMarketCapRankings, toggleFavorite, addToWatchlist } from '../api/stockApi';
import { Search, ChevronLeft, ChevronRight, RefreshCw, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import classNames from 'classnames';

const MarketCapRankings = () => {
    const navigate = useNavigate();
    const [market, setMarket] = useState('KOSPI');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50; // 페이지당 50개 (총 6페이지 = 300위)
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [favorites, setFavorites] = useState(new Set());

    const loadRankings = useCallback(async (targetMarket, page) => {
        setIsLoading(true);
        try {
            const data = await fetchMarketCapRankings(targetMarket, page, pageSize);
            if (data && data.stocks) {
                setStocks(data.stocks);
            } else {
                setStocks([]);
            }
        } catch (e) {
            console.error(e);
            setStocks([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRankings(market, currentPage);
    }, [market, currentPage, loadRankings]);

    const handleMarketChange = (newMarket) => {
        if (market === newMarket) return;
        setMarket(newMarket);
        setCurrentPage(1);
        setSearchKeyword('');
    };

    const handleToggleFavorite = async (e, stockCode) => {
        e.stopPropagation();
        const isFav = favorites.has(stockCode);
        try {
            await toggleFavorite(stockCode, 1, !isFav);
            setFavorites(prev => {
                const next = new Set(prev);
                if (isFav) next.delete(stockCode);
                else next.add(stockCode);
                return next;
            });
        } catch (err) {
            console.error(err);
        }
    };

    // 검색 필터링 (현재 로드된 50개 내에서 필터링)
    const filteredStocks = useMemo(() => {
        if (!searchKeyword.trim()) return stocks;
        const kw = searchKeyword.trim().toLowerCase();
        return stocks.filter(s => 
            (s.stockName && s.stockName.toLowerCase().includes(kw)) ||
            (s.itemCode && s.itemCode.includes(kw))
        );
    }, [stocks, searchKeyword]);

    // 시가총액 금액 포맷 (억원 -> 조, 억 포맷팅)
    const formatMarketCap = (mcapStr) => {
        if (!mcapStr) return '-';
        const num = parseInt(mcapStr.replace(/,/g, ''), 10);
        if (isNaN(num)) return mcapStr;
        if (num >= 10000) {
            const jo = Math.floor(num / 10000);
            const eok = num % 10000;
            return eok > 0 ? `${jo.toLocaleString()}조 ${eok.toLocaleString()}억` : `${jo.toLocaleString()}조`;
        }
        return `${num.toLocaleString()}억`;
    };

    const startRank = (currentPage - 1) * pageSize + 1;
    const endRank = Math.min(currentPage * pageSize, 300);

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] text-[var(--theme-text)] overflow-hidden transition-colors duration-500">
            {/* 상단 헤더 & 컨트롤 바 */}
            <div className="p-4 sm:p-6 border-b border-[var(--theme-border)] bg-[var(--theme-header)] shadow-md shrink-0 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 shadow-lg text-white">
                                <TrendingUp size={20} />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[var(--theme-point)] to-[var(--theme-sub-point)] bg-clip-text text-transparent">
                                시가총액 순위 (TOP 300)
                            </h1>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-bold">
                            코스피 및 코스닥 실시간 시총 상위 300대 종목을 50위씩 페이징하여 조회합니다.
                        </p>
                    </div>

                    {/* 시장 선택 탭 & 새로고침 */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-[var(--theme-bg)] p-1 rounded-xl border border-[var(--theme-border)]">
                            <button
                                onClick={() => handleMarketChange('KOSPI')}
                                className={classNames(
                                    "px-4 py-1.5 text-xs font-black rounded-lg transition-all",
                                    market === 'KOSPI' 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                                        : "text-slate-500 hover:text-[var(--theme-text)]"
                                )}
                            >
                                KOSPI (코스피)
                            </button>
                            <button
                                onClick={() => handleMarketChange('KOSDAQ')}
                                className={classNames(
                                    "px-4 py-1.5 text-xs font-black rounded-lg transition-all",
                                    market === 'KOSDAQ' 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                                        : "text-slate-500 hover:text-[var(--theme-text)]"
                                )}
                            >
                                KOSDAQ (코스닥)
                            </button>
                        </div>

                        <button 
                            onClick={() => loadRankings(market, currentPage)}
                            disabled={isLoading}
                            className="p-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:bg-slate-700/20 text-slate-400 hover:text-[var(--theme-text)] transition-all active:scale-95 shrink-0"
                            title="새로고침"
                        >
                            <RefreshCw size={18} className={classNames({ "animate-spin": isLoading })} />
                        </button>
                    </div>
                </div>

                {/* 검색창 & 순위 인덱스 */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="종목명 또는 코드 검색..."
                            className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] text-xs font-bold pl-9 pr-4 py-2 rounded-xl border border-[var(--theme-border)] focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-black text-slate-400">
                        <span>
                            현재 순위: <strong className="text-[var(--theme-point)]">{startRank}위 ~ {endRank}위</strong> (총 300위)
                        </span>

                        {/* 상단 미니 페이징 */}
                        <div className="flex items-center gap-1 bg-[var(--theme-bg)] p-0.5 rounded-lg border border-[var(--theme-border)]">
                            <button
                                disabled={currentPage <= 1 || isLoading}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-1 rounded text-slate-500 hover:text-[var(--theme-text)] disabled:opacity-30 disabled:hover:text-slate-500"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-2 text-[11px] font-mono text-[var(--theme-point)] font-black">
                                {currentPage} / 6
                            </span>
                            <button
                                disabled={currentPage >= 6 || isLoading}
                                onClick={() => setCurrentPage(p => Math.min(6, p + 1))}
                                className="p-1 rounded text-slate-500 hover:text-[var(--theme-text)] disabled:opacity-30 disabled:hover:text-slate-500"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 리스트 영역 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6">
                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <RefreshCw size={28} className="animate-spin text-indigo-500" />
                        <span className="text-xs font-black">시가총액 순위를 불러오는 중...</span>
                    </div>
                ) : filteredStocks.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                        <span className="text-sm font-black">검색된 종목이 없습니다.</span>
                    </div>
                ) : (
                    <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-xl overflow-hidden transition-colors">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[620px]">
                                <thead>
                                    <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/60 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="py-3 px-3 text-center w-14">순위</th>
                                        <th className="py-3 px-2 text-center w-10">관심</th>
                                        <th className="py-3 px-4">종목명 / 코드</th>
                                        <th className="py-3 px-4 text-right">현재가</th>
                                        <th className="py-3 px-4 text-right">전일대비</th>
                                        <th className="py-3 px-4 text-right">등락률</th>
                                        <th className="py-3 px-4 text-right">시가총액</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--theme-border)]/50 text-xs font-bold">
                                    {filteredStocks.map((stock, idx) => {
                                        const rank = (currentPage - 1) * pageSize + idx + 1;
                                        const rate = parseFloat(stock.fluctuationsRatio || '0');
                                        const isUp = rate > 0;
                                        const isDown = rate < 0;
                                        const isFav = favorites.has(stock.itemCode);

                                        return (
                                            <tr
                                                key={stock.itemCode}
                                                onClick={() => navigate(`/stock/${stock.itemCode}`, { state: { stockName: stock.stockName } })}
                                                className="hover:bg-[var(--theme-bg)]/70 cursor-pointer transition-colors group active:bg-[var(--theme-bg)]"
                                            >
                                                {/* 순위 */}
                                                <td className="py-3 px-3 text-center">
                                                    <span className={classNames(
                                                        "inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs font-mono",
                                                        rank === 1 ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm" :
                                                        rank === 2 ? "bg-slate-300/20 text-slate-300 border border-slate-300/40" :
                                                        rank === 3 ? "bg-amber-700/20 text-amber-600 border border-amber-700/40" :
                                                        "text-slate-400 font-bold"
                                                    )}>
                                                        {rank}
                                                    </span>
                                                </td>

                                                {/* 즐겨찾기 별표 */}
                                                <td className="py-3 px-2 text-center" onClick={(e) => handleToggleFavorite(e, stock.itemCode)}>
                                                    <button className="p-1 text-slate-500 hover:text-yellow-400 transition-colors">
                                                        <Star size={16} className={classNames({
                                                            "fill-yellow-400 text-yellow-400": isFav,
                                                            "hover:text-yellow-400": !isFav
                                                        })} />
                                                    </button>
                                                </td>

                                                {/* 종목명 / 코드 */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-sm text-[var(--theme-text)] group-hover:text-[var(--theme-point)] transition-colors">
                                                            {stock.stockName}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 font-mono font-bold bg-[var(--theme-bg)] px-1.5 py-0.5 rounded border border-[var(--theme-border)]">
                                                            {stock.itemCode}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* 현재가 */}
                                                <td className="py-3 px-4 text-right">
                                                    <span className={classNames(
                                                        "font-black text-sm font-mono tracking-tight",
                                                        isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-slate-400"
                                                    )}>
                                                        {stock.closePrice}원
                                                    </span>
                                                </td>

                                                {/* 전일대비 */}
                                                <td className="py-3 px-4 text-right">
                                                    <span className={classNames(
                                                        "font-black text-xs font-mono inline-flex items-center gap-0.5",
                                                        isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-slate-400"
                                                    )}>
                                                        {isUp && <TrendingUp size={12} />}
                                                        {isDown && <TrendingDown size={12} />}
                                                        {!isUp && !isDown && <Minus size={12} />}
                                                        {stock.compareToPreviousClosePrice || '0'}
                                                    </span>
                                                </td>

                                                {/* 등락률 */}
                                                <td className="py-3 px-4 text-right">
                                                    <span className={classNames(
                                                        "inline-block px-2 py-0.5 rounded-lg text-xs font-black font-mono",
                                                        isUp ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                                        isDown ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                                    )}>
                                                        {isUp ? '+' : ''}{stock.fluctuationsRatio}%
                                                    </span>
                                                </td>

                                                {/* 시가총액 */}
                                                <td className="py-3 px-4 text-right font-black font-mono text-[var(--theme-point)] text-xs">
                                                    {formatMarketCap(stock.marketValue)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 하단 페이징 컨트롤 바 (1~6페이지 = 300위) */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pb-12">
                    <span className="text-xs font-bold text-slate-500">
                        {market} 시총 {startRank}위 ~ {endRank}위 표시 중 (페이지당 50개)
                    </span>

                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={currentPage <= 1 || isLoading}
                            onClick={() => setCurrentPage(1)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-xs font-bold text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                        >
                            처음
                        </button>
                        <button
                            disabled={currentPage <= 1 || isLoading}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="p-1.5 rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {[1, 2, 3, 4, 5, 6].map(pageNo => (
                            <button
                                key={pageNo}
                                onClick={() => setCurrentPage(pageNo)}
                                className={classNames(
                                    "w-8 h-8 rounded-xl text-xs font-black font-mono transition-all",
                                    currentPage === pageNo
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                                        : "bg-[var(--theme-header)] border border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)]"
                                )}
                            >
                                {pageNo}
                            </button>
                        ))}

                        <button
                            disabled={currentPage >= 6 || isLoading}
                            onClick={() => setCurrentPage(p => Math.min(6, p + 1))}
                            className="p-1.5 rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <button
                            disabled={currentPage >= 6 || isLoading}
                            onClick={() => setCurrentPage(6)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-xs font-bold text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                        >
                            끝 (300위)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketCapRankings;
