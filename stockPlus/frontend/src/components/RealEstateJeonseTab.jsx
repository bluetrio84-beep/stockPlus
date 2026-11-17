import React, { useState, useEffect, useMemo } from 'react';
import { Flame, TrendingUp, Home, Search, ArrowUpRight, Layers } from 'lucide-react';
import { fetchRealEstateMomentum } from '../api/stockApi';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

export default function RealEstateJeonseTab() {
    const [momentumList, setMomentumList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('both'); // 'both' | 'jeonse_lead' | 'sale_lead'
    const [searchKeyword, setSearchKeyword] = useState('');

    // KB부동산 공식 매매+전세 동시 집계 데이터 로드
    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchRealEstateMomentum('KB').then((data) => {
            if (active) {
                setMomentumList(data || []);
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, []);

    // 시장 요약 통계 (4종 KPI)
    const kpiStats = useMemo(() => {
        if (!momentumList.length) {
            return { latestDate: '-', jeonseUpCnt: 0, avgJeonse: '0.00', bothUpCnt: 0, jeonseLeadCnt: 0 };
        }
        let jeonseUpCnt = 0;
        let bothUpCnt = 0;
        let jeonseLeadCnt = 0;
        let sumJeonse = 0;
        momentumList.forEach((item) => {
            const s = Number(item.latest_rate ?? 0);
            const j = Number(item.latest_jeonse_rate ?? 0);
            sumJeonse += j;
            if (j > 0) jeonseUpCnt += 1;
            if (s > 0 && j > 0) bothUpCnt += 1;
            if (j > s) jeonseLeadCnt += 1;
        });
        return {
            latestDate: momentumList[0]?.latest_date || '-',
            jeonseUpCnt,
            avgJeonse: (sumJeonse / momentumList.length).toFixed(2),
            bothUpCnt,
            jeonseLeadCnt,
            total: momentumList.length
        };
    }, [momentumList]);

    // 정렬 및 필터링된 리스트
    const filteredList = useMemo(() => {
        const kw = searchKeyword.trim();
        let list = momentumList.filter((item) => !kw || item.region_name.includes(kw));

        if (viewMode === 'both') {
            // 실수요 동반 강세 (매매 + 전세 합산)
            list = [...list].sort((a, b) => {
                const scoreA = Number(a.latest_rate ?? 0) + Number(a.latest_jeonse_rate ?? 0);
                const scoreB = Number(b.latest_rate ?? 0) + Number(b.latest_jeonse_rate ?? 0);
                return scoreB - scoreA;
            });
        } else if (viewMode === 'jeonse_lead') {
            // 전세 우위 (전세변동률 - 매매변동률 큰 순)
            list = [...list].sort((a, b) => {
                const gapA = Number(a.latest_jeonse_rate ?? 0) - Number(a.latest_rate ?? 0);
                const gapB = Number(b.latest_jeonse_rate ?? 0) - Number(b.latest_rate ?? 0);
                return gapB - gapA;
            });
        } else {
            // 매매 선도 (매매변동률 - 전세변동률 큰 순)
            list = [...list].sort((a, b) => {
                const gapA = Number(a.latest_rate ?? 0) - Number(a.latest_jeonse_rate ?? 0);
                const gapB = Number(b.latest_rate ?? 0) - Number(b.latest_jeonse_rate ?? 0);
                return gapB - gapA;
            });
        }
        return list.slice(0, 30);
    }, [momentumList, viewMode, searchKeyword]);

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* 1. 매매·전세 시장 심리 요약 KPI (모바일 2x2 압축) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl p-2.5 sm:p-3.5">
                    <div className="text-[10px] text-slate-400 font-bold">전세 상승 지역 ({kpiStats.latestDate})</div>
                    <div className="text-sm sm:text-lg font-black text-amber-400 mt-0.5">
                        {kpiStats.jeonseUpCnt} <span className="text-[10px] text-slate-500 font-bold">/ {kpiStats.total || 0}곳</span>
                    </div>
                </div>
                <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl p-2.5 sm:p-3.5">
                    <div className="text-[10px] text-slate-400 font-bold">전국 시군구 평균 전세</div>
                    <div className={classNames("text-sm sm:text-lg font-black mt-0.5", Number(kpiStats.avgJeonse) >= 0 ? "text-amber-400" : "text-sky-400")}>
                        {Number(kpiStats.avgJeonse) >= 0 ? `+${kpiStats.avgJeonse}%` : `${kpiStats.avgJeonse}%`}
                    </div>
                </div>
                <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl p-2.5 sm:p-3.5">
                    <div className="text-[10px] text-slate-400 font-bold">매매·전세 동반 상승</div>
                    <div className="text-sm sm:text-lg font-black text-rose-400 mt-0.5">
                        {kpiStats.bothUpCnt} <span className="text-[10px] text-slate-500 font-bold">곳</span>
                    </div>
                </div>
                <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl p-2.5 sm:p-3.5">
                    <div className="text-[10px] text-slate-400 font-bold">전세 강세 우위 (전세&gt;매매)</div>
                    <div className="text-sm sm:text-lg font-black text-emerald-400 mt-0.5">
                        {kpiStats.jeonseLeadCnt} <span className="text-[10px] text-slate-500 font-bold">곳</span>
                    </div>
                </div>
            </div>

            {/* 2. 매매 vs 전세 컨트롤 바 & 랭킹 */}
            <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                        <h3 className="text-xs sm:text-sm font-black text-[var(--theme-text)] flex items-center gap-1.5">
                            <Layers size={15} className="text-amber-400 shrink-0" />
                            <span>KB 실측 매매 vs 전세 수급 강도 (Top 30)</span>
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                            전세 상승폭이 매매보다 크면 실수요 압력(하방 경직·상승 전환 신호)을 의미합니다
                        </p>
                    </div>

                    <div className="relative w-full sm:w-52">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="지역명 검색 (예: 안양, 강남)"
                            className="w-full pl-7 pr-2.5 py-1.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-[11px] text-[var(--theme-text)] placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                    </div>
                </div>

                {/* 뷰 모드 3칩 */}
                <div className="grid grid-cols-3 sm:inline-flex gap-1 bg-[var(--theme-bg)] p-1 rounded-xl border border-[var(--theme-border)] mb-3 w-full sm:w-auto">
                    <button
                        onClick={() => setViewMode('both')}
                        className={classNames(
                            "px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black transition-all text-center",
                            viewMode === 'both' ? "bg-rose-500 text-white shadow" : "text-slate-400 hover:text-[var(--theme-text)]"
                        )}
                    >
                        🔥 동반 강세
                    </button>
                    <button
                        onClick={() => setViewMode('jeonse_lead')}
                        className={classNames(
                            "px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black transition-all text-center",
                            viewMode === 'jeonse_lead' ? "bg-amber-500 text-white shadow" : "text-slate-400 hover:text-[var(--theme-text)]"
                        )}
                    >
                        🏠 전세 우위
                    </button>
                    <button
                        onClick={() => setViewMode('sale_lead')}
                        className={classNames(
                            "px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black transition-all text-center",
                            viewMode === 'sale_lead' ? "bg-cyan-600 text-white shadow" : "text-slate-400 hover:text-[var(--theme-text)]"
                        )}
                    >
                        📈 매매 선도
                    </button>
                </div>

                {loading ? (
                    <div className="py-10 text-center text-xs text-slate-400 font-bold">매매·전세 데이터를 불러오는 중...</div>
                ) : filteredList.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-500">조건에 해당하는 지역이 없습니다.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredList.map((item, idx) => {
                            const sale = Number(item.latest_rate ?? 0);
                            const jeonse = Number(item.latest_jeonse_rate ?? 0);
                            const jSum4 = Number(item.jeonse_sum_4w ?? 0);
                            const gap = jeonse - sale;
                            return (
                                <div
                                    key={item.region_name}
                                    className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-2.5 flex flex-col justify-between gap-1.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={classNames(
                                                "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0",
                                                idx < 3 ? "bg-amber-500 text-slate-950" : "bg-slate-700/50 text-slate-300"
                                            )}>
                                                {idx + 1}
                                            </span>
                                            <span className="text-[11.5px] font-black text-[var(--theme-text)] truncate">{item.region_name}</span>
                                        </div>
                                        <span className={classNames(
                                            "text-[9.5px] font-black px-1.5 py-0.5 rounded border shrink-0",
                                            gap > 0.03
                                                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                                : gap < -0.03
                                                    ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                                    : "bg-slate-700/30 text-slate-400 border-slate-600/30"
                                        )}>
                                            {gap > 0 ? `전세+${gap.toFixed(2)}%p` : `매매+${Math.abs(gap).toFixed(2)}%p`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[var(--theme-border)]/40 text-center">
                                        <div>
                                            <div className="text-[9px] text-slate-400">매매(주간)</div>
                                            <div className={classNames("text-[11px] font-black", sale >= 0 ? "text-rose-400" : "text-sky-400")}>
                                                {sale >= 0 ? `+${sale.toFixed(2)}%` : `${sale.toFixed(2)}%`}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-slate-400">전세(주간)</div>
                                            <div className={classNames("text-[11px] font-black", jeonse >= 0 ? "text-amber-400" : "text-sky-400")}>
                                                {jeonse >= 0 ? `+${jeonse.toFixed(2)}%` : `${jeonse.toFixed(2)}%`}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-slate-400">전세 4주누적</div>
                                            <div className={classNames("text-[11px] font-black", jSum4 >= 0 ? "text-emerald-400" : "text-sky-400")}>
                                                {jSum4 >= 0 ? `+${jSum4.toFixed(2)}%` : `${jSum4.toFixed(2)}%`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
