import React, { useState, useEffect, useMemo } from 'react';
import { 
    Home, Building2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
    RefreshCw, Layers, MapPin, Calendar, Flame, AlertCircle, ShieldCheck, 
    CheckCircle2, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import classNames from 'classnames';
import { 
    fetchRealEstateSummary, 
    fetchRealEstateRankings, 
    fetchRealEstateTransactions 
} from '../api/stockApi';

const RealEstateDashboard = () => {
    // 탭: 'rankings' (주간 상승/하락률 Top 50) | 'transactions' (실거래가 신고가/하락거래)
    const [activeTab, setActiveTab] = useState('rankings');

    // 1. 기관 선택 (KB부동산 vs 한국부동산원)
    const [sourceType, setSourceType] = useState('KB'); // 'KB' | 'REB'

    // 2. 지역 선택 (전체 vs 수도권 vs 지방)
    const [regionType, setRegionType] = useState('ALL'); // 'ALL' | '수도권' | '지방'

    // 3. 상승/하락 순위 선택
    const [orderType, setOrderType] = useState('UP'); // 'UP' (상승률 Top 50) | 'DOWN' (하락률 Top 50)

    // 4. 실거래가 거래 유형 선택
    const [tradeType, setTradeType] = useState('ALL'); // 'ALL' | '신고가' | '하락거래'

    // 데이터 상태
    const [summary, setSummary] = useState(null);
    const [rankings, setRankings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState('');

    // 데이터 로드
    const loadData = async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'rankings') {
                const [summaryRes, rankingsRes] = await Promise.all([
                    fetchRealEstateSummary(sourceType),
                    fetchRealEstateRankings(sourceType, regionType, orderType, 50)
                ]);
                setSummary(summaryRes);
                setRankings(rankingsRes);
            } else {
                const txRes = await fetchRealEstateTransactions(tradeType, 50);
                setTransactions(txRes);
            }
        } catch (e) {
            console.error('RealEstate load error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab, sourceType, regionType, orderType, tradeType]);

    // 검색 필터링
    const filteredRankings = useMemo(() => {
        if (!searchKeyword.trim()) return rankings;
        const kw = searchKeyword.trim().toLowerCase();
        return rankings.filter(r => (r.region_name && r.region_name.toLowerCase().includes(kw)));
    }, [rankings, searchKeyword]);

    const filteredTransactions = useMemo(() => {
        if (!searchKeyword.trim()) return transactions;
        const kw = searchKeyword.trim().toLowerCase();
        return transactions.filter(t => 
            (t.complex_name && t.complex_name.toLowerCase().includes(kw)) ||
            (t.region_name && t.region_name.toLowerCase().includes(kw))
        );
    }, [transactions, searchKeyword]);

    // 억/만원 포맷터
    const formatPrice = (val) => {
        if (!val) return '0원';
        const num = parseInt(val, 10);
        if (num >= 10000) {
            const eok = Math.floor(num / 10000);
            const man = num % 10000;
            return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
        }
        return `${num.toLocaleString()}만`;
    };

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] text-[var(--theme-text)] overflow-hidden transition-colors duration-500">
            {/* 상단 헤더 바 */}
            <div className="bg-[var(--theme-header)] border-b border-[var(--theme-border)] px-4 sm:px-6 py-3.5 shrink-0 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 shadow-xs">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-black tracking-tight text-[var(--theme-text)]">
                                    부동산 시장 현황
                                </h1>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    REAL ESTATE
                                </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                                한국부동산원(REB) & KB부동산 공표 주간 시세 변동률 및 핵심 아파트 실거래가
                            </p>
                        </div>
                    </div>

                    {/* 메인 탭 전환: 주간 시세 랭킹 vs 아파트 실거래가 */}
                    <div className="flex items-center gap-1.5 bg-[var(--theme-bg)] p-1 rounded-xl border border-[var(--theme-border)] shrink-0 self-start md:self-auto">
                        <button
                            onClick={() => { setActiveTab('rankings'); setSearchKeyword(''); }}
                            className={classNames(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                activeTab === 'rankings'
                                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                                    : "text-slate-400 hover:text-[var(--theme-text)]"
                            )}
                        >
                            <TrendingUp size={14} />
                            <span>주간 변동률 Top 50</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('transactions'); setSearchKeyword(''); }}
                            className={classNames(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                                activeTab === 'transactions'
                                    ? "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                                    : "text-slate-400 hover:text-[var(--theme-text)]"
                            )}
                        >
                            <Flame size={14} />
                            <span>아파트 실거래가 (신고가/급락)</span>
                        </button>
                    </div>
                </div>

                {/* 서브 컨트롤 필터 바 */}
                {activeTab === 'rankings' ? (
                    <div className="mt-3.5 pt-3 border-t border-[var(--theme-border)]/50 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            {/* 통계 출처 토글: KB부동산 vs 한국부동산원 */}
                            <div className="flex items-center bg-[var(--theme-bg)] p-0.5 rounded-lg border border-[var(--theme-border)]">
                                <button
                                    onClick={() => setSourceType('KB')}
                                    className={classNames(
                                        "px-2.5 py-1 rounded-md text-[11px] font-black transition-all",
                                        sourceType === 'KB' ? "bg-amber-500 text-white shadow-xs" : "text-slate-400 hover:text-[var(--theme-text)]"
                                    )}
                                >
                                    KB부동산
                                </button>
                                <button
                                    onClick={() => setSourceType('REB')}
                                    className={classNames(
                                        "px-2.5 py-1 rounded-md text-[11px] font-black transition-all",
                                        sourceType === 'REB' ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-[var(--theme-text)]"
                                    )}
                                >
                                    한국부동산원 (REB)
                                </button>
                            </div>

                            {/* 지역 권역 필터: 전체 vs 수도권 vs 지방 */}
                            <div className="flex items-center bg-[var(--theme-bg)] p-0.5 rounded-lg border border-[var(--theme-border)]">
                                {[
                                    { id: 'ALL', name: '전국 전체' },
                                    { id: '수도권', name: '수도권 (서울/경기/인천)' },
                                    { id: '지방', name: '지방 광역시/도' }
                                ].map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setRegionType(r.id)}
                                        className={classNames(
                                            "px-2.5 py-1 rounded-md text-[11px] font-black transition-all",
                                            regionType === r.id ? "bg-[var(--theme-header)] text-[var(--theme-point)] border border-[var(--theme-border)] shadow-xs" : "text-slate-400 hover:text-[var(--theme-text)]"
                                        )}
                                    >
                                        {r.name}
                                    </button>
                                ))}
                            </div>

                            {/* 정렬: 상승률 Top 50 vs 하락률 Top 50 */}
                            <div className="flex items-center bg-[var(--theme-bg)] p-0.5 rounded-lg border border-[var(--theme-border)]">
                                <button
                                    onClick={() => setOrderType('UP')}
                                    className={classNames(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all",
                                        orderType === 'UP' ? "bg-red-500/20 text-red-500 border border-red-500/30" : "text-slate-400 hover:text-[var(--theme-text)]"
                                    )}
                                >
                                    <TrendingUp size={12} /> 상승률 Top 50
                                </button>
                                <button
                                    onClick={() => setOrderType('DOWN')}
                                    className={classNames(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black transition-all",
                                        orderType === 'DOWN' ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" : "text-slate-400 hover:text-[var(--theme-text)]"
                                    )}
                                >
                                    <TrendingDown size={12} /> 하락률 Top 50
                                </button>
                            </div>
                        </div>

                        {/* 검색창 */}
                        <div className="w-full sm:w-60">
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="시·군·구·지역명 검색..."
                                className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] text-xs font-bold px-3 py-1.5 rounded-xl border border-[var(--theme-border)] focus:outline-none focus:border-rose-500 transition-colors"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="mt-3.5 pt-3 border-t border-[var(--theme-border)]/50 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-[var(--theme-bg)] p-0.5 rounded-lg border border-[var(--theme-border)]">
                                {[
                                    { id: 'ALL', name: '전체 실거래' },
                                    { id: '신고가', name: '🔥 최고가 / 신고가 거래' },
                                    { id: '하락거래', name: '❄️ 직전 대비 하락 거래' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTradeType(t.id)}
                                        className={classNames(
                                            "px-3 py-1 rounded-md text-[11px] font-black transition-all",
                                            tradeType === t.id ? "bg-[var(--theme-header)] text-[var(--theme-point)] border border-[var(--theme-border)] shadow-xs" : "text-slate-400 hover:text-[var(--theme-text)]"
                                        )}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="w-full sm:w-64">
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="단지명 또는 지역 검색 (헬리오시티 등)..."
                                className="w-full bg-[var(--theme-bg)] text-[var(--theme-text)] text-xs font-bold px-3 py-1.5 rounded-xl border border-[var(--theme-border)] focus:outline-none focus:border-rose-500 transition-colors"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 메인 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-4">
                {/* 1. 매크로 요약 지표 카드 (주간 탭일 때 노출) */}
                {activeTab === 'rankings' && summary && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                        {[
                            { label: '전국 매매', val: summary.nation_rate, tag: '전국 종합' },
                            { label: '수도권', val: summary.capital_rate, tag: '서울/경기/인천' },
                            { label: '서울', val: summary.seoul_rate, tag: '25개 자치구' },
                            { label: '경기', val: summary.gyeonggi_rate, tag: '28개 시/3개 군' },
                            { label: '인천', val: summary.incheon_rate, tag: '8개 구/2개 군' },
                            { label: '지방', val: summary.local_rate, tag: '5대광역시/도' }
                        ].map((item, idx) => {
                            const isUp = item.val > 0;
                            const isDown = item.val < 0;
                            return (
                                <div key={idx} className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl p-3 shadow-sm hover:border-slate-500/30 transition-all">
                                    <div className="flex items-center justify-between text-slate-400 mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                                        <span className="text-[9px] font-mono text-slate-500">{summary.base_date}</span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className={classNames(
                                            "text-lg sm:text-xl font-black font-mono tracking-tight",
                                            isUp ? "text-red-500" : isDown ? "text-blue-500" : "text-slate-400"
                                        )}>
                                            {isUp ? '+' : ''}{item.val}%
                                        </span>
                                        <span className={classNames(
                                            "text-[10px] font-black px-1.5 py-0.5 rounded",
                                            isUp ? "bg-red-500/10 text-red-500" : isDown ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-400"
                                        )}>
                                            {isUp ? '상승' : isDown ? '하락' : '보합'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 2. 주간 시세 변동률 Top 50 테이블 */}
                {activeTab === 'rankings' ? (
                    isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <RefreshCw size={28} className="animate-spin text-rose-500" />
                            <span className="text-xs font-black">부동산 시세 동향 데이터를 불러오는 중...</span>
                        </div>
                    ) : filteredRankings.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                            <span className="text-sm font-black">해당 조건의 부동산 지역 데이터가 없습니다.</span>
                        </div>
                    ) : (
                        <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between bg-[var(--theme-bg)]/40">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-[var(--theme-text)]">
                                        {sourceType === 'KB' ? 'KB부동산' : '한국부동산원(REB)'} {regionType === 'ALL' ? '전국' : regionType} {orderType === 'UP' ? '주간 상승률 Top 50' : '주간 하락률 Top 50'}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-500">
                                        (총 {filteredRankings.length}개 지역 표시)
                                    </span>
                                </div>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    기준: {summary?.base_date || '최신'}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead>
                                        <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/60 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                            <th className="py-3 px-4 text-center w-16">순위</th>
                                            <th className="py-3 px-4">지역명</th>
                                            <th className="py-3 px-4 text-center">권역 분류</th>
                                            <th className="py-3 px-4 text-right">매매가격 증감률(%)</th>
                                            <th className="py-3 px-4 text-right">전세가격 증감률(%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--theme-border)]/50 text-xs font-bold">
                                        {filteredRankings.map((r, idx) => {
                                            const rank = idx + 1;
                                            const rate = parseFloat(r.fluctuation_rate || '0');
                                            const isUp = rate > 0;
                                            const isDown = rate < 0;

                                            return (
                                                <tr key={idx} className="hover:bg-[var(--theme-bg)]/70 transition-colors">
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={classNames(
                                                            "inline-flex items-center justify-center w-6 h-6 rounded-lg font-black text-xs font-mono",
                                                            rank === 1 ? "bg-amber-500/20 text-amber-500 border border-amber-500/40" :
                                                            rank === 2 ? "bg-slate-400/20 text-slate-300 border border-slate-400/40" :
                                                            rank === 3 ? "bg-amber-700/20 text-amber-600 border border-amber-700/40" :
                                                            "text-slate-400"
                                                        )}>
                                                            {rank}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="font-black text-sm text-[var(--theme-text)]">
                                                            {r.region_name}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={classNames(
                                                            "text-[10px] font-black px-2 py-0.5 rounded border",
                                                            r.region_type === '수도권' 
                                                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" 
                                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                        )}>
                                                            {r.region_type}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <span className={classNames(
                                                            "inline-block px-2.5 py-0.5 rounded-lg text-xs font-black font-mono",
                                                            isUp ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                                            isDown ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                                                            "bg-slate-500/10 text-slate-400"
                                                        )}>
                                                            {isUp ? '+' : ''}{rate}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-xs">
                                                        {r.jeonse_rate !== undefined && r.jeonse_rate !== 0 ? `${r.jeonse_rate > 0 ? '+' : ''}${r.jeonse_rate}%` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : (
                    /* 3. 아파트 실거래가 (신고가 / 하락거래) 카드 그리드 */
                    isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <RefreshCw size={28} className="animate-spin text-rose-500" />
                            <span className="text-xs font-black">실거래가 데이터를 불러오는 중...</span>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-500">
                            <span className="text-sm font-black">해당 실거래 내역이 없습니다.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-12">
                            {filteredTransactions.map((tx) => {
                                const isShin = tx.trade_type === '신고가';
                                const diffKrw = parseInt(tx.diff_krw || '0', 10);
                                const isUp = diffKrw > 0;

                                return (
                                    <div 
                                        key={tx.id}
                                        className={classNames(
                                            "bg-[var(--theme-header)] border rounded-2xl p-4 shadow-lg transition-all",
                                            isShin ? "border-amber-500/30 hover:border-amber-500/60" : "border-blue-500/30 hover:border-blue-500/60"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2.5">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-black text-base text-[var(--theme-text)]">
                                                        {tx.complex_name}
                                                    </span>
                                                    <span className={classNames(
                                                        "text-[9px] font-black px-1.5 py-0.5 rounded border leading-tight",
                                                        isShin 
                                                            ? "bg-amber-500/20 text-amber-500 border-amber-500/40" 
                                                            : "bg-blue-500/20 text-blue-500 border-blue-500/40"
                                                    )}>
                                                        {tx.trade_type}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400 font-bold block mt-0.5">
                                                    {tx.region_name} • {tx.floor}층
                                                </span>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-[10px] font-black font-mono text-slate-500 block">
                                                    계약일: {tx.trade_date}
                                                </span>
                                                <span className="text-[11px] font-black text-slate-400">
                                                    전용 {tx.area_m2}㎡
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2.5 border-t border-[var(--theme-border)]/60 flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase block">실거래 금액</span>
                                                <span className="text-lg font-black font-mono text-[var(--theme-point)]">
                                                    {formatPrice(tx.price_krw)}
                                                </span>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-slate-500 uppercase block">직전 거래 대비</span>
                                                <span className={classNames(
                                                    "text-sm font-black font-mono inline-flex items-center gap-0.5",
                                                    isUp ? "text-red-500" : "text-blue-500"
                                                )}>
                                                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                                    {isUp ? '+' : ''}{formatPrice(diffKrw)} ({tx.diff_rate}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default RealEstateDashboard;
