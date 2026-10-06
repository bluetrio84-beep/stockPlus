import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMarketCapRankings, fetchStockPrice, toggleFavorite } from '../api/stockApi';
import { Search, ChevronLeft, ChevronRight, RefreshCw, Star, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Flame, Sparkles, CheckSquare, Square } from 'lucide-react';
import classNames from 'classnames';
import { getStockStatusBadge } from '../utils/stockUtils';

const MarketCapRankings = () => {
    const navigate = useNavigate();
    const [market, setMarket] = useState('KOSPI'); // ALL | KOSPI | KOSDAQ
    const [rankingType, setRankingType] = useState('marketValue'); // marketValue | up | down | high52week | low52week
    const [excludeEtf, setExcludeEtf] = useState(true); // ETF/ETN 제외 여부 (기본값: true)
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;
    const [stocks, setStocks] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [favorites, setFavorites] = useState(new Set());
    const [stockBadges, setStockBadges] = useState({});

    const maxPages = useMemo(() => {
        const pagesByCount = Math.max(1, Math.ceil(totalCount / pageSize));
        return Math.min(6, pagesByCount); // 최대 6페이지 (300위)
    }, [totalCount]);

    const loadRankings = useCallback(async (targetMarket, targetType, page, isExcludeEtf) => {
        setIsLoading(true);
        try {
            const data = await fetchMarketCapRankings(targetMarket, targetType, page, pageSize, isExcludeEtf);
            if (data && data.stocks) {
                setStocks(data.stocks);
                setTotalCount(data.totalCount || data.stocks.length);

                // 현재 페이지 종목들에 대한 정밀 상태(정지, 주의, 경고 등) 비동기 조회
                setStockBadges(prev => {
                    const missingStocks = data.stocks.filter(s => s.itemCode && !prev[s.itemCode]);
                    if (missingStocks.length > 0) {
                        Promise.all(missingStocks.map(async (s) => {
                            try {
                                const detail = await fetchStockPrice(s.itemCode);
                                const badge = getStockStatusBadge(detail) || getStockStatusBadge(s);
                                return { code: s.itemCode, badge };
                            } catch {
                                return { code: s.itemCode, badge: getStockStatusBadge(s) };
                            }
                        })).then(results => {
                            setStockBadges(current => {
                                const next = { ...current };
                                results.forEach(r => {
                                    if (r.badge) next[r.code] = r.badge;
                                });
                                return next;
                            });
                        });
                    }
                    return prev;
                });
            } else {
                setStocks([]);
                setTotalCount(0);
            }
        } catch (e) {
            console.error(e);
            setStocks([]);
            setTotalCount(0);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRankings(market, rankingType, currentPage, excludeEtf);
    }, [market, rankingType, currentPage, excludeEtf, loadRankings]);

    const handleMarketChange = (newMarket) => {
        if (market === newMarket) return;
        setMarket(newMarket);
        setCurrentPage(1);
        setSearchKeyword('');
    };

    const handleTypeChange = (newType) => {
        if (rankingType === newType) return;
        setRankingType(newType);
        setCurrentPage(1);
        setSearchKeyword('');
    };

    const handleToggleExcludeEtf = () => {
        setExcludeEtf(prev => !prev);
        setCurrentPage(1);
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

    // 검색 필터링 (현재 로드된 목록 내에서 필터링)
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
        const num = parseInt(String(mcapStr).replace(/,/g, ''), 10);
        if (isNaN(num)) return mcapStr;
        if (num >= 10000) {
            const jo = Math.floor(num / 10000);
            return (num % 10000 === 0) ? `${jo.toLocaleString()}조` : `${(num / 10000).toFixed(1)}조`;
        }
        return `${num.toLocaleString()}억`;
    };

    const startRank = (currentPage - 1) * pageSize + 1;
    const endRank = Math.min(currentPage * pageSize, totalCount || (startRank + stocks.length - 1));

    const typeTabs = [
        { id: 'marketValue', name: '시가총액', icon: Sparkles, color: 'text-amber-500' },
        { id: 'up', name: '상승', icon: TrendingUp, color: 'text-red-500' },
        { id: 'down', name: '하락', icon: TrendingDown, color: 'text-blue-500' },
        { id: 'high52week', name: '신고가(52주)', icon: ArrowUpRight, color: 'text-rose-500' },
        { id: 'low52week', name: '신저가(52주)', icon: ArrowDownRight, color: 'text-cyan-500' },
    ];

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] text-[var(--theme-text)] overflow-hidden transition-colors duration-500">
            {/* 상단 헤더 & 컨트롤 바 */}
            <div className="p-4 sm:p-6 border-b border-[var(--theme-border)] bg-[var(--theme-header)] shadow-md shrink-0 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-rose-500 shadow-lg text-white">
                                <TrendingUp size={20} />
                            </div>
                            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[var(--theme-point)] to-[var(--theme-sub-point)] bg-clip-text text-transparent">
                                실시간 증시 동향
                            </h1>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-bold">
                            코스피 및 코스닥의 시가총액, 실시간 급등/급락, 52주 신고가/신저가 순위를 확인하세요.
                        </p>
                    </div>

                    {/* 시장 선택 탭 & 새로고침 */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-[var(--theme-bg)] p-1 rounded-xl border border-[var(--theme-border)]">
                            <button
                                onClick={() => handleMarketChange('ALL')}
                                className={classNames(
                                    "px-3.5 py-1.5 text-xs font-black rounded-lg transition-all",
                                    market === 'ALL' 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                                        : "text-slate-500 hover:text-[var(--theme-text)]"
                                )}
                            >
                                전체 (ALL)
                            </button>
                            <button
                                onClick={() => handleMarketChange('KOSPI')}
                                className={classNames(
                                    "px-3.5 py-1.5 text-xs font-black rounded-lg transition-all",
                                    market === 'KOSPI' 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                                        : "text-slate-500 hover:text-[var(--theme-text)]"
                                )}
                            >
                                KOSPI
                            </button>
                            <button
                                onClick={() => handleMarketChange('KOSDAQ')}
                                className={classNames(
                                    "px-3.5 py-1.5 text-xs font-black rounded-lg transition-all",
                                    market === 'KOSDAQ' 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                                        : "text-slate-500 hover:text-[var(--theme-text)]"
                                )}
                            >
                                KOSDAQ
                            </button>
                        </div>

                        {/* ETF/ETN 제외 토글 버튼 (기본값: 체크됨) */}
                        <button
                            onClick={handleToggleExcludeEtf}
                            className={classNames(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all active:scale-95 shrink-0",
                                excludeEtf
                                    ? "bg-indigo-500/15 border-indigo-500/40 text-[var(--theme-point)] shadow-sm"
                                    : "bg-[var(--theme-bg)] border-[var(--theme-border)] text-slate-500 hover:text-[var(--theme-text)]"
                            )}
                            title="체크 시 순위 목록에서 ETF 및 ETN을 제외하고 순수 일반 주식만 표시합니다."
                        >
                            {excludeEtf ? (
                                <CheckSquare size={15} className="text-indigo-500" />
                            ) : (
                                <Square size={15} className="text-slate-500" />
                            )}
                            <span>ETF/ETN 제외</span>
                        </button>

                        <button 
                            onClick={() => loadRankings(market, rankingType, currentPage, excludeEtf)}
                            disabled={isLoading}
                            className="p-2 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:bg-slate-700/20 text-slate-400 hover:text-[var(--theme-text)] transition-all active:scale-95 shrink-0"
                            title="새로고침"
                        >
                            <RefreshCw size={18} className={classNames({ "animate-spin": isLoading })} />
                        </button>
                    </div>
                </div>

                {/* 증시 동향 서브 탭 (시가총액, 상승, 하락, 신고가, 신저가) */}
                <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {typeTabs.map(tab => {
                        const Icon = tab.icon;
                        const isSelected = rankingType === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTypeChange(tab.id)}
                                className={classNames(
                                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 border",
                                    isSelected
                                        ? "bg-indigo-500/15 border-indigo-500/40 text-[var(--theme-point)] shadow-sm"
                                        : "bg-[var(--theme-bg)]/80 border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)] hover:border-slate-500/40"
                                )}
                            >
                                <Icon size={14} className={classNames(tab.color, { "animate-pulse": isSelected && (tab.id === 'up' || tab.id === 'high52week') })} />
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* 검색창 & 순위 인덱스 */}
                <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                            {market} {typeTabs.find(t => t.id === rankingType)?.name}: <strong className="text-[var(--theme-point)]">{startRank}위 ~ {endRank}위</strong> (총 {totalCount.toLocaleString()}개)
                        </span>

                        {/* 상단 미니 페이징 */}
                        {maxPages > 1 && (
                            <div className="flex items-center gap-1 bg-[var(--theme-bg)] p-0.5 rounded-lg border border-[var(--theme-border)]">
                                <button
                                    disabled={currentPage <= 1 || isLoading}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="p-1 rounded text-slate-500 hover:text-[var(--theme-text)] disabled:opacity-30 disabled:hover:text-slate-500"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="px-2 text-[11px] font-mono text-[var(--theme-point)] font-black">
                                    {currentPage} / {maxPages}
                                </span>
                                <button
                                    disabled={currentPage >= maxPages || isLoading}
                                    onClick={() => setCurrentPage(p => Math.min(maxPages, p + 1))}
                                    className="p-1 rounded text-slate-500 hover:text-[var(--theme-text)] disabled:opacity-30 disabled:hover:text-slate-500"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 메인 리스트 영역 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 sm:p-6">
                {isLoading ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <RefreshCw size={28} className="animate-spin text-indigo-500" />
                        <span className="text-xs font-black">증시 동향 순위를 불러오는 중...</span>
                    </div>
                ) : filteredStocks.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                        <span className="text-sm font-black">해당 조건의 종목이 없습니다.</span>
                    </div>
                ) : (
                    <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl sm:rounded-2xl shadow-xl overflow-hidden transition-colors">
                        <div className="overflow-x-auto sm:overflow-visible">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/60 text-[9px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                        <th className="py-2 sm:py-3 px-1 sm:px-3 text-center w-6 sm:w-14">순위</th>
                                        <th className="py-2 sm:py-3 px-0.5 sm:px-2 text-center w-5 sm:w-10">관심</th>
                                        <th className="py-2 sm:py-3 px-1 sm:px-4">종목명 / 코드</th>
                                        <th className="py-2 sm:py-3 px-1 sm:px-4 text-right">현재가</th>
                                        <th className="py-2 sm:py-3 px-0.5 sm:px-4 text-right">전일대비</th>
                                        <th className="py-2 sm:py-3 px-0.5 sm:px-4 text-right">등락률</th>
                                        <th className="py-2 sm:py-3 px-0.5 sm:px-4 text-right">거래량</th>
                                        <th className="py-2 sm:py-3 px-1 sm:px-4 text-right">시가총액</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--theme-border)]/50 text-[10px] sm:text-xs font-bold">
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
                                                <td className="py-1.5 sm:py-3 px-0.5 sm:px-3 text-center">
                                                    <span className={classNames(
                                                        "inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-xl font-black text-[9px] sm:text-xs font-mono",
                                                        rank === 1 ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm" :
                                                        rank === 2 ? "bg-slate-300/20 text-slate-300 border border-slate-300/40" :
                                                        rank === 3 ? "bg-amber-700/20 text-amber-600 border border-amber-700/40" :
                                                        "text-slate-400 font-bold"
                                                    )}>
                                                        {rank}
                                                    </span>
                                                </td>

                                                {/* 즐겨찾기 별표 */}
                                                <td className="py-1.5 sm:py-3 px-0.5 sm:px-2 text-center" onClick={(e) => handleToggleFavorite(e, stock.itemCode)}>
                                                    <button className="p-0.5 sm:p-1 text-slate-500 hover:text-yellow-400 transition-colors">
                                                        <Star className={classNames("w-3.5 h-3.5 sm:w-4 sm:h-4", {
                                                            "fill-yellow-400 text-yellow-400": isFav,
                                                            "hover:text-yellow-400": !isFav
                                                        })} />
                                                    </button>
                                                </td>

                                                {/* 종목명 / 코드 */}
                                                <td className="py-1.5 sm:py-3 px-1 sm:px-4 min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5 min-w-0">
                                                        <span className="font-black text-[11px] sm:text-sm text-[var(--theme-text)] group-hover:text-[var(--theme-point)] transition-colors truncate max-w-[65px] xs:max-w-[85px] sm:max-w-none" title={stock.stockName}>
                                                            {stock.stockName}
                                                        </span>
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <span className="text-[8px] sm:text-[10px] text-slate-500 font-mono font-bold bg-[var(--theme-bg)] px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded border border-[var(--theme-border)] leading-tight">
                                                                {stock.itemCode}
                                                            </span>
                                                            {(() => {
                                                                const badge = stockBadges[stock.itemCode] || getStockStatusBadge(stock);
                                                                if (!badge) return null;
                                                                return (
                                                                    <span className={classNames("text-[8px] sm:text-[10px] px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded border leading-tight shrink-0", badge.color)}>
                                                                        {badge.label}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {stock.sosok !== undefined && (
                                                                <span className={classNames(
                                                                    "hidden xs:inline-block text-[8px] sm:text-[9px] font-black px-1 py-0.2 sm:px-1.5 sm:py-0.5 rounded border leading-tight shrink-0",
                                                                    (String(stock.sosok) === '0' || stock.sosok === 0)
                                                                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                                                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                                )}>
                                                                    {String(stock.sosok) === '0' || stock.sosok === 0 ? '코스피' : '코스닥'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 현재가 */}
                                                <td className="py-1.5 sm:py-3 px-1 sm:px-4 text-right whitespace-nowrap">
                                                    <span className={classNames(
                                                        "font-black text-[10px] sm:text-sm font-mono tracking-tight",
                                                        isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-slate-400"
                                                    )}>
                                                        {stock.closePrice}<span className="text-[8px] sm:text-xs font-normal ml-0.5 text-slate-400">원</span>
                                                    </span>
                                                </td>

                                                {/* 전일대비 */}
                                                <td className="py-1.5 sm:py-3 px-0.5 sm:px-4 text-right whitespace-nowrap">
                                                    <span className={classNames(
                                                        "font-bold text-[8.5px] sm:text-xs font-mono inline-flex items-center gap-0.5",
                                                        isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-slate-400"
                                                    )}>
                                                        {isUp && <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                                        {isDown && <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                                        {!isUp && !isDown && <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                                                        {stock.compareToPreviousClosePrice || '0'}
                                                    </span>
                                                </td>

                                                {/* 등락률 */}
                                                <td className="py-1.5 sm:py-3 px-0.5 sm:px-4 text-right whitespace-nowrap">
                                                    <span className={classNames(
                                                        "inline-block px-1 sm:px-2 py-0.5 rounded sm:rounded-lg text-[8.5px] sm:text-xs font-black font-mono",
                                                        isUp ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                                        isDown ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                                        "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                                    )}>
                                                        {isUp ? '+' : ''}{stock.fluctuationsRatio}%
                                                    </span>
                                                </td>

                                                {/* 거래량 */}
                                                <td className="py-1.5 sm:py-3 px-0.5 sm:px-4 text-right font-mono text-slate-400 text-[8px] sm:text-xs whitespace-nowrap">
                                                    {stock.accumulatedTradingVolume || '-'}
                                                </td>

                                                {/* 시가총액 */}
                                                <td className="py-1.5 sm:py-3 px-1 sm:px-4 text-right font-black font-mono text-[var(--theme-point)] text-[8.5px] sm:text-xs whitespace-nowrap">
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

                {/* 하단 페이징 컨트롤 바 (1~maxPages) */}
                {maxPages > 1 && (
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pb-12">
                        <span className="text-[11px] sm:text-xs font-bold text-slate-500 text-center sm:text-left">
                            {market} {typeTabs.find(t => t.id === rankingType)?.name} {startRank}위 ~ {endRank}위 표시 중 (페이지당 50개)
                        </span>

                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
                            <button
                                disabled={currentPage <= 1 || isLoading}
                                onClick={() => setCurrentPage(1)}
                                className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-[11px] sm:text-xs font-bold text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                            >
                                처음
                            </button>
                            <button
                                disabled={currentPage <= 1 || isLoading}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                            >
                                <ChevronLeft size={15} />
                            </button>

                            {Array.from({ length: maxPages }, (_, i) => i + 1).map(pageNo => (
                                <button
                                    key={pageNo}
                                    onClick={() => setCurrentPage(pageNo)}
                                    className={classNames(
                                        "w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black font-mono transition-all",
                                        currentPage === pageNo
                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-105"
                                            : "bg-[var(--theme-header)] border border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)]"
                                    )}
                                >
                                    {pageNo}
                                </button>
                            ))}

                            <button
                                disabled={currentPage >= maxPages || isLoading}
                                onClick={() => setCurrentPage(p => Math.min(maxPages, p + 1))}
                                className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                            >
                                <ChevronRight size={15} />
                            </button>
                            <button
                                disabled={currentPage >= maxPages || isLoading}
                                onClick={() => setCurrentPage(maxPages)}
                                className="px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl bg-[var(--theme-header)] border border-[var(--theme-border)] text-[11px] sm:text-xs font-bold text-slate-400 hover:text-[var(--theme-text)] disabled:opacity-30 transition-colors"
                            >
                                끝
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketCapRankings;
