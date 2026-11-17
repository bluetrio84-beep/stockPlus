import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ShieldAlert, MapPin, Maximize2, X, Search, Flame, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fetchRealEstateHistory, fetchRealEstateMomentum } from '../api/stockApi';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const QUICK_REGIONS = [
    '서울', '수도권', '경기', '인천', '전국',
    '안양시 동안구', '안양시 만안구',
    '화성시 동탄구', '용인시 기흥구', '구리시',
    '과천시', '성남시 분당구', '서울 강남구'
];

// 규제 상태 판별 (현재 규제지역은 모두 토허제+투기+조정 3중 규제)
const NEW_TRIPLE_REGULATED = new Set(['화성시 동탄구', '용인시 기흥구', '구리시']);
const EXISTING_TRIPLE_REGULATED = new Set([
    '과천시', '성남시 분당구', '성남시 수정구', '성남시 중원구',
    '광명시', '안양시 동안구', '의왕시', '하남시',
    '수원시 영통구', '수원시 장안구', '수원시 팔달구', '용인시 수지구'
]);

const getRegulationStatus = (regionName) => {
    if (!regionName) return { type: 'non', label: '비규제', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    if (NEW_TRIPLE_REGULATED.has(regionName)) {
        return { type: 'triple', label: '3중규제(확대)', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
    }
    if (regionName.startsWith('서울 ') || regionName === '서울' || EXISTING_TRIPLE_REGULATED.has(regionName)) {
        return { type: 'triple', label: '3중규제', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    return { type: 'non', label: '비규제', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
};

// 기본 3그룹 비교 (확대 3중규제 vs 기존 3중규제 vs 비규제)
const REGULATION_GROUPS = [
    {
        id: 'triple',
        title: '🔴 확대 3중 규제 (토허제·투기·조정)',
        badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        regions: ['화성시 동탄구', '용인시 기흥구', '구리시']
    },
    {
        id: 'core',
        title: '🟠 기존 3중 규제 (서울·경기 주요)',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        regions: ['서울 강남구', '서울 서초구', '과천시', '성남시 분당구', '안양시 동안구', '수원시 영통구', '용인시 수지구', '하남시']
    },
    {
        id: 'adjacent',
        title: '🟢 인접 비규제 (풍선효과 모니터)',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        regions: ['안양시 만안구', '수원시 권선구', '용인시 처인구', '군포시', '부천시 원미구', '김포시', '남양주시', '오산시']
    }
];

export default function RealEstateTrendTab({ sourceType = 'KB' }) {
    const [selectedRegion, setSelectedRegion] = useState('안양시 동안구');
    const [comboAreaFilter, setComboAreaFilter] = useState('ALL'); // 'ALL' | 'SEOUL' | 'GYEONGGI' | 'INCHEON' | 'LOCAL'
    const [monitorScope, setMonitorScope] = useState('GROUPS'); // 'GROUPS' | 'SEOUL' | 'METRO' | 'NON_REG'

    const [history, setHistory] = useState([]);
    const [momentumList, setMomentumList] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingMomentum, setLoadingMomentum] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activePointIdx, setActivePointIdx] = useState(null);
    const [mapModalMode, setMapModalMode] = useState(null); // null | 'light' | 'dark'
    const [momentumTab, setMomentumTab] = useState('4w'); // '4w' | '20w'

    // 1. 전 지역 모멘텀 집계 로드
    useEffect(() => {
        let active = true;
        setLoadingMomentum(true);
        fetchRealEstateMomentum(sourceType).then((data) => {
            if (active) {
                setMomentumList(data || []);
                setLoadingMomentum(false);
            }
        });
        return () => { active = false; };
    }, [sourceType]);

    // 2. 선택 지역 20주 시계열 로드 (KB + REB 동시)
    useEffect(() => {
        let active = true;
        setLoadingHistory(true);
        setActivePointIdx(null);
        fetchRealEstateHistory(selectedRegion, 'WEEKLY').then((data) => {
            if (active) {
                setHistory(data || []);
                setLoadingHistory(false);
            }
        });
        return () => { active = false; };
    }, [selectedRegion]);

    // 시계열 데이터를 날짜별 KB / REB 매핑으로 정제 (최근 20주)
    const chartData = useMemo(() => {
        const byDate = {};
        history.forEach((row) => {
            const d = row.base_date;
            if (!d) return;
            if (!byDate[d]) byDate[d] = { date: d, KB: null, REB: null, jeonse: null };
            const rate = Number(row.fluctuation_rate ?? 0);
            if (row.source_type === 'KB') {
                byDate[d].KB = rate;
                byDate[d].jeonse = Number(row.jeonse_rate ?? 0);
            } else if (row.source_type === 'REB') {
                byDate[d].REB = rate;
            }
        });
        return Object.values(byDate)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-20);
    }, [history]);

    // KB / REB 20주 누적 합산 계산
    const cumStats = useMemo(() => {
        let kbSum = 0, kbCnt = 0, rebSum = 0, rebCnt = 0;
        chartData.forEach((p) => {
            if (p.KB !== null) { kbSum += p.KB; kbCnt += 1; }
            if (p.REB !== null) { rebSum += p.REB; rebCnt += 1; }
        });
        const latest = chartData[chartData.length - 1] || {};
        return {
            kbSum: kbSum.toFixed(2),
            kbCnt,
            rebSum: rebSum.toFixed(2),
            rebCnt,
            latestDate: latest.date || '-',
            latestKb: latest.KB,
            latestReb: latest.REB
        };
    }, [chartData]);

    // 모멘텀 딕셔너리 (지역명 -> 객체)
    const momentumMap = useMemo(() => {
        const m = {};
        momentumList.forEach((item) => {
            m[item.region_name] = item;
        });
        return m;
    }, [momentumList]);

    // 콤보박스용 권역별 시·군·구 목록 분류
    const comboRegions = useMemo(() => {
        const names = momentumList.map(m => m.region_name).sort((a, b) => a.localeCompare(b, 'ko'));
        if (comboAreaFilter === 'SEOUL') {
            return ['서울', ...names.filter(n => n.startsWith('서울 '))];
        }
        if (comboAreaFilter === 'GYEONGGI') {
            const gyeonggiSet = new Set(
                momentumList
                    .filter(m => m.region_type === '수도권' && !m.region_name.startsWith('서울 ') && !m.region_name.startsWith('인천 '))
                    .map(m => m.region_name)
            );
            return ['경기', ...Array.from(gyeonggiSet).sort((a, b) => a.localeCompare(b, 'ko'))];
        }
        if (comboAreaFilter === 'INCHEON') {
            return ['인천', ...names.filter(n => n.startsWith('인천 '))];
        }
        if (comboAreaFilter === 'LOCAL') {
            const localNames = momentumList
                .filter(m => m.region_type === '지방')
                .map(m => m.region_name)
                .sort((a, b) => a.localeCompare(b, 'ko'));
            return ['지방', ...localNames];
        }
        return ['전국', '수도권', '서울', '경기', '인천', ...names];
    }, [momentumList, comboAreaFilter]);

    // 모니터 섹션 Select Box에 따른 리스트
    const monitorList = useMemo(() => {
        const sorted = [...momentumList].sort((a, b) => Number(b.latest_rate) - Number(a.latest_rate));
        if (monitorScope === 'SEOUL') {
            return sorted.filter(m => m.region_name.startsWith('서울 '));
        }
        if (monitorScope === 'METRO') {
            return sorted.filter(m => m.region_type === '수도권' && !m.region_name.startsWith('서울 '));
        }
        if (monitorScope === 'NON_REG') {
            return sorted.filter(m => m.region_type === '수도권' && getRegulationStatus(m.region_name).type === 'non');
        }
        return [];
    }, [momentumList, monitorScope]);

    // 검색 자동완성 후보
    const filteredRegionSuggestions = useMemo(() => {
        const q = searchQuery.trim();
        if (!q) return [];
        const allNames = Array.from(new Set([...QUICK_REGIONS, ...momentumList.map(m => m.region_name)]));
        return allNames.filter(name => name.includes(q)).slice(0, 10);
    }, [searchQuery, momentumList]);

    // 모멘텀 TOP 10 (4주 vs 20주)
    const topMomentum = useMemo(() => {
        const sorted = [...momentumList].sort((a, b) => {
            const valA = Number(momentumTab === '4w' ? a.sum_4w : a.sum_20w);
            const valB = Number(momentumTab === '4w' ? b.sum_4w : b.sum_20w);
            return valB - valA;
        });
        return sorted.slice(0, 10);
    }, [momentumList, momentumTab]);

    // SVG 차트 좌표 계산
    const svgChart = useMemo(() => {
        if (!chartData.length) return null;
        const W = 600, H = 200, PAD_L = 42, PAD_R = 16, PAD_T = 18, PAD_B = 26;
        const innerW = W - PAD_L - PAD_R;
        const innerH = H - PAD_T - PAD_B;

        const vals = [];
        chartData.forEach((p) => {
            if (p.KB !== null) vals.push(p.KB);
            if (p.REB !== null) vals.push(p.REB);
        });
        if (!vals.length) return null;

        let minV = Math.min(0, ...vals);
        let maxV = Math.max(0.1, ...vals);
        const padV = Math.max(0.05, (maxV - minV) * 0.15);
        minV -= padV;
        maxV += padV;

        const getX = (idx) => chartData.length === 1 ? PAD_L + innerW / 2 : PAD_L + (idx / (chartData.length - 1)) * innerW;
        const getY = (val) => PAD_T + ((maxV - val) / (maxV - minV)) * innerH;

        const buildPath = (key) => {
            let d = '';
            chartData.forEach((p, idx) => {
                if (p[key] === null) return;
                const x = getX(idx).toFixed(1);
                const y = getY(p[key]).toFixed(1);
                d += (d === '' ? `M ${x} ${y}` : ` L ${x} ${y}`);
            });
            return d;
        };

        return {
            W, H, PAD_L, PAD_R, PAD_T, PAD_B,
            zeroY: getY(0),
            minV, maxV,
            kbPath: buildPath('KB'),
            rebPath: buildPath('REB'),
            points: chartData.map((p, idx) => ({
                ...p,
                x: getX(idx),
                yKb: p.KB !== null ? getY(p.KB) : null,
                yReb: p.REB !== null ? getY(p.REB) : null,
            }))
        };
    }, [chartData]);

    const focusedPoint = activePointIdx !== null && chartData[activePointIdx]
        ? chartData[activePointIdx]
        : chartData[chartData.length - 1];

    const selectedRegStatus = getRegulationStatus(selectedRegion);

    return (
        <div className="space-y-3 sm:space-y-4">
            {/* 1. 관심지역 20주 시계열 추이 & KB vs REB 비교 차트 */}
            <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div>
                        <h3 className="text-xs sm:text-sm font-black text-[var(--theme-text)] flex items-center gap-1.5">
                            <TrendingUp size={15} className="text-rose-500 shrink-0" />
                            <span>지역별 20주 변동률 추이 · KB vs 부동산원</span>
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>선택: <strong className="text-rose-400">{selectedRegion}</strong></span>
                            <span className={classNames("px-1.5 py-0.2 rounded text-[9.5px] font-black border", selectedRegStatus.cls)}>
                                {selectedRegStatus.label}
                            </span>
                        </p>
                    </div>

                    {/* 지역 검색 입력 */}
                    <div className="relative w-full sm:w-56">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="지역 검색 (예: 분당, 동안, 강남)"
                            className="w-full pl-7 pr-2.5 py-1.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-[11px] text-[var(--theme-text)] placeholder-slate-500 focus:outline-none focus:border-rose-500"
                        />
                        {filteredRegionSuggestions.length > 0 && (
                            <div className="absolute z-30 left-0 right-0 mt-1 bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-lg shadow-xl max-h-44 overflow-y-auto">
                                {filteredRegionSuggestions.map((name) => (
                                    <button
                                        key={name}
                                        onClick={() => { setSelectedRegion(name); setSearchQuery(''); }}
                                        className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[var(--theme-text)] hover:bg-rose-500/15 hover:text-rose-400 transition-colors"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 빠른 선택 칩 (서울/수도권/핵심지역) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 no-scrollbar">
                    {QUICK_REGIONS.map((reg) => (
                        <button
                            key={reg}
                            onClick={() => setSelectedRegion(reg)}
                            className={classNames(
                                "px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-bold whitespace-nowrap border transition-all shrink-0",
                                selectedRegion === reg
                                    ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                                    : "bg-[var(--theme-bg)] text-slate-400 border-[var(--theme-border)] hover:text-[var(--theme-text)]"
                            )}
                        >
                            {reg}
                        </button>
                    ))}
                </div>

                {/* [신규] 2단 콤보박스 (권역 + 서울 구 / 경기도 시·군·구 전체 선택) */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 mb-2.5">
                    <select
                        value={comboAreaFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            setComboAreaFilter(val);
                            if (val === 'SEOUL') setSelectedRegion('서울');
                            else if (val === 'GYEONGGI') setSelectedRegion('경기');
                            else if (val === 'INCHEON') setSelectedRegion('인천');
                            else if (val === 'LOCAL') setSelectedRegion('지방');
                        }}
                        className="bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-500"
                    >
                        <option value="ALL">전체 권역 (전국)</option>
                        <option value="SEOUL">서울 (25개 자치구)</option>
                        <option value="GYEONGGI">경기 (시·군·구 전체)</option>
                        <option value="INCHEON">인천 (구·군 전체)</option>
                        <option value="LOCAL">지방 광역시</option>
                    </select>

                    <select
                        value={comboRegions.includes(selectedRegion) ? selectedRegion : ''}
                        onChange={(e) => {
                            if (e.target.value) setSelectedRegion(e.target.value);
                        }}
                        className="bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-[11px] font-bold rounded-lg px-2 py-1.5 sm:min-w-[200px] focus:outline-none focus:border-rose-500"
                    >
                        {!comboRegions.includes(selectedRegion) && (
                            <option value="">-- 세부 지역 선택 ({comboRegions.length}곳) --</option>
                        )}
                        {comboRegions.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 요약 KPI 칩 3종 (모바일 3열 압축) */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 mb-2.5">
                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg p-2">
                        <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold">KB 누적 ({cumStats.kbCnt}주)</div>
                        <div className={classNames(
                            "text-xs sm:text-sm font-black mt-0.5",
                            Number(cumStats.kbSum) >= 0 ? "text-rose-400" : "text-sky-400"
                        )}>
                            {Number(cumStats.kbSum) >= 0 ? `+${cumStats.kbSum}%` : `${cumStats.kbSum}%`}
                        </div>
                    </div>
                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg p-2">
                        <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold">부동산원 누적 ({cumStats.rebCnt}주)</div>
                        <div className={classNames(
                            "text-xs sm:text-sm font-black mt-0.5",
                            Number(cumStats.rebSum) >= 0 ? "text-cyan-400" : "text-blue-400"
                        )}>
                            {cumStats.rebCnt > 0 ? (Number(cumStats.rebSum) >= 0 ? `+${cumStats.rebSum}%` : `${cumStats.rebSum}%`) : '-'}
                        </div>
                    </div>
                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg p-2">
                        <div className="text-[9.5px] sm:text-[10px] text-slate-400 font-bold truncate">
                            {focusedPoint ? focusedPoint.date : '최신 주차'}
                        </div>
                        <div className="text-[10.5px] sm:text-xs font-black mt-0.5 flex flex-wrap items-center gap-1">
                            <span className="text-rose-400">
                                KB {focusedPoint?.KB != null ? `${focusedPoint.KB >= 0 ? '+' : ''}${focusedPoint.KB}%` : '-'}
                            </span>
                            <span className="text-cyan-400">
                                REB {focusedPoint?.REB != null ? `${focusedPoint.REB >= 0 ? '+' : ''}${focusedPoint.REB}%` : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 반응형 SVG 차트 */}
                <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-2 sm:p-3">
                    {loadingHistory ? (
                        <div className="h-40 flex items-center justify-center text-xs text-slate-400 font-bold">
                            시계열 데이터를 불러오는 중...
                        </div>
                    ) : svgChart ? (
                        <div>
                            <div className="flex items-center justify-end gap-3 text-[10px] font-bold mb-1">
                                <span className="flex items-center gap-1 text-rose-400">
                                    <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span> KB부동산
                                </span>
                                <span className="flex items-center gap-1 text-cyan-400">
                                    <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span> 한국부동산원
                                </span>
                            </div>
                            <svg viewBox={`0 0 ${svgChart.W} ${svgChart.H}`} className="w-full h-auto overflow-visible select-none">
                                {/* 0% 기준선 */}
                                <line
                                    x1={svgChart.PAD_L} y1={svgChart.zeroY}
                                    x2={svgChart.W - svgChart.PAD_R} y2={svgChart.zeroY}
                                    stroke="#64748b" strokeDasharray="3 3" strokeWidth="1" opacity="0.6"
                                />
                                <text x={svgChart.PAD_L - 6} y={svgChart.zeroY + 3} textAnchor="end" fontSize="9" fill="#94a3b8">0%</text>
                                <text x={svgChart.PAD_L - 6} y={svgChart.PAD_T + 5} textAnchor="end" fontSize="9" fill="#94a3b8">
                                    +{svgChart.maxV.toFixed(2)}%
                                </text>
                                <text x={svgChart.PAD_L - 6} y={svgChart.H - svgChart.PAD_B} textAnchor="end" fontSize="9" fill="#94a3b8">
                                    {svgChart.minV.toFixed(2)}%
                                </text>

                                {/* 라인 */}
                                {svgChart.kbPath && (
                                    <path d={svgChart.kbPath} fill="none" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                )}
                                {svgChart.rebPath && (
                                    <path d={svgChart.rebPath} fill="none" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                )}

                                {/* 포인트 & 날짜 라벨 */}
                                {svgChart.points.map((pt, idx) => {
                                    const showLabel = idx === 0 || idx === svgChart.points.length - 1 || idx % 4 === 0;
                                    const isActive = activePointIdx === idx;
                                    return (
                                        <g key={pt.date} onClick={() => setActivePointIdx(idx)} className="cursor-pointer">
                                            <rect x={pt.x - 10} y={svgChart.PAD_T} width="20" height={svgChart.H - svgChart.PAD_T - svgChart.PAD_B} fill="transparent" />
                                            {isActive && (
                                                <line x1={pt.x} y1={svgChart.PAD_T} x2={pt.x} y2={svgChart.H - svgChart.PAD_B} stroke="#f43f5e" strokeWidth="1" opacity="0.4" />
                                            )}
                                            {pt.yKb !== null && (
                                                <circle cx={pt.x} cy={pt.yKb} r={isActive ? 4.5 : 2.8} fill="#f43f5e" stroke="#0f172a" strokeWidth="1" />
                                            )}
                                            {pt.yReb !== null && (
                                                <circle cx={pt.x} cy={pt.yReb} r={isActive ? 4.5 : 2.8} fill="#22d3ee" stroke="#0f172a" strokeWidth="1" />
                                            )}
                                            {showLabel && (
                                                <text x={pt.x} y={svgChart.H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
                                                    {pt.date.slice(5)}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    ) : (
                        <div className="h-36 flex items-center justify-center text-xs text-slate-500">
                            해당 지역의 시계열 데이터가 없습니다.
                        </div>
                    )}
                </div>
            </div>

            {/* 2. 토허제 3중 규제 & 서울/수도권 규제·비규제 집중 모니터 */}
            <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                        <h3 className="text-xs sm:text-sm font-black text-[var(--theme-text)] flex items-center gap-1.5">
                            <ShieldAlert size={15} className="text-rose-500 shrink-0" />
                            <span>토허제 3중 규제 & 서울·수도권 집중 모니터</span>
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                            지역 클릭 시 상단 20주 추이 차트로 즉시 연동됩니다 ({sourceType} 기준)
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* [신규] 서울 / 수도권 모니터 Select Box */}
                        <select
                            value={monitorScope}
                            onChange={(e) => setMonitorScope(e.target.value)}
                            className="bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-[10.5px] font-black rounded-lg px-2.5 py-1 focus:outline-none focus:border-rose-500"
                        >
                            <option value="GROUPS">핵심 비교 (확대3중·기존3중·비규제)</option>
                            <option value="SEOUL">서울 전역 (25개 구 · 3중규제)</option>
                            <option value="METRO">수도권 (경기·인천 전체)</option>
                            <option value="NON_REG">수도권 비규제만 모아보기</option>
                        </select>
                        <button
                            onClick={() => setMapModalMode('light')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10.5px] font-black hover:bg-rose-500/25 transition-all"
                        >
                            <Maximize2 size={11} />
                            <span>토허제 지도</span>
                        </button>
                        <button
                            onClick={() => setMapModalMode('dark')}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/40 text-slate-300 border border-slate-600/40 text-[10.5px] font-black hover:bg-slate-700/70 transition-all"
                        >
                            <span>다크</span>
                        </button>
                    </div>
                </div>

                {monitorScope === 'GROUPS' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                        {REGULATION_GROUPS.map((grp) => (
                            <div key={grp.id} className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-2.5 sm:p-3">
                                <div className={classNames("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black border mb-2", grp.badgeClass)}>
                                    {grp.title}
                                </div>
                                <div className="space-y-1.5">
                                    {grp.regions.map((rName) => {
                                        const stat = momentumMap[rName];
                                        const rate = stat ? Number(stat.latest_rate) : null;
                                        const sum4 = stat ? Number(stat.sum_4w) : null;
                                        return (
                                            <button
                                                key={rName}
                                                onClick={() => setSelectedRegion(rName)}
                                                className={classNames(
                                                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all",
                                                    selectedRegion === rName
                                                        ? "border-rose-500 bg-rose-500/10"
                                                        : "border-[var(--theme-border)]/60 hover:border-slate-500"
                                                )}
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <MapPin size={11} className="text-slate-400 shrink-0" />
                                                    <span className="text-[11px] font-bold text-[var(--theme-text)] truncate">{rName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={classNames(
                                                        "text-[11px] font-black",
                                                        rate === null ? "text-slate-500" : rate > 0 ? "text-rose-400" : rate < 0 ? "text-sky-400" : "text-slate-400"
                                                    )}>
                                                        {rate !== null ? `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%` : '-'}
                                                    </span>
                                                    <span className="text-[9.5px] font-bold text-slate-400 bg-[var(--theme-card)] px-1.5 py-0.5 rounded">
                                                        4주 {sum4 !== null ? `${sum4 > 0 ? '+' : ''}${sum4.toFixed(2)}%` : '-'}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-1">
                        {monitorList.map((stat) => {
                            const rate = Number(stat.latest_rate ?? 0);
                            const sum4 = Number(stat.sum_4w ?? 0);
                            const reg = getRegulationStatus(stat.region_name);
                            return (
                                <button
                                    key={stat.region_name}
                                    onClick={() => setSelectedRegion(stat.region_name)}
                                    className={classNames(
                                        "flex items-center justify-between px-2.5 py-2 rounded-xl border text-left transition-all bg-[var(--theme-bg)]",
                                        selectedRegion === stat.region_name
                                            ? "border-rose-500 bg-rose-500/10"
                                            : "border-[var(--theme-border)] hover:border-slate-500"
                                    )}
                                >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={classNames("px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0", reg.cls)}>
                                            {reg.label}
                                        </span>
                                        <span className="text-[11px] font-bold text-[var(--theme-text)] truncate">{stat.region_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={classNames("text-[11px] font-black", rate > 0 ? "text-rose-400" : rate < 0 ? "text-sky-400" : "text-slate-400")}>
                                            {rate > 0 ? `+${rate.toFixed(2)}%` : `${rate.toFixed(2)}%`}
                                        </span>
                                        <span className="text-[9.5px] font-bold text-slate-400 bg-[var(--theme-card)] px-1.5 py-0.5 rounded">
                                            4주 {sum4 > 0 ? `+${sum4.toFixed(2)}%` : `${sum4.toFixed(2)}%`}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 3. 최근 4주 · 20주 모멘텀 급등 TOP 10 */}
            <div className="bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-xs sm:text-sm font-black text-[var(--theme-text)] flex items-center gap-1.5">
                        <Flame size={15} className="text-amber-400 shrink-0" />
                        <span>누적 모멘텀 급등 TOP 10 ({sourceType})</span>
                    </h3>
                    <div className="flex items-center bg-[var(--theme-bg)] p-0.5 rounded-lg border border-[var(--theme-border)]">
                        <button
                            onClick={() => setMomentumTab('4w')}
                            className={classNames(
                                "px-2.5 py-1 rounded-md text-[10px] font-black transition-all",
                                momentumTab === '4w' ? "bg-rose-500 text-white" : "text-slate-400"
                            )}
                        >
                            최근 4주 누적
                        </button>
                        <button
                            onClick={() => setMomentumTab('20w')}
                            className={classNames(
                                "px-2.5 py-1 rounded-md text-[10px] font-black transition-all",
                                momentumTab === '20w' ? "bg-rose-500 text-white" : "text-slate-400"
                            )}
                        >
                            20주 누적
                        </button>
                    </div>
                </div>

                {loadingMomentum ? (
                    <div className="py-8 text-center text-xs text-slate-400">모멘텀 데이터 집계 중...</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {topMomentum.map((item, idx) => {
                            const cumVal = Number(momentumTab === '4w' ? item.sum_4w : item.sum_20w);
                            const latestVal = Number(item.latest_rate);
                            const upWks = Number(item.up_weeks_4w ?? 0);
                            const reg = getRegulationStatus(item.region_name);
                            return (
                                <button
                                    key={item.region_name}
                                    onClick={() => setSelectedRegion(item.region_name)}
                                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-rose-500/60 transition-all text-left"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={classNames(
                                            "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0",
                                            idx < 3 ? "bg-rose-500 text-white" : "bg-slate-700/50 text-slate-300"
                                        )}>
                                            {idx + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[11.5px] font-black text-[var(--theme-text)] truncate">{item.region_name}</span>
                                                <span className={classNames("px-1 py-0.2 rounded text-[8.5px] font-black border shrink-0", reg.cls)}>
                                                    {reg.label}
                                                </span>
                                            </div>
                                            <div className="text-[9.5px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                <span>최근주 {latestVal >= 0 ? `+${latestVal.toFixed(2)}%` : `${latestVal.toFixed(2)}%`}</span>
                                                <span className="text-emerald-400 font-bold">4주중 {upWks}주↑</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {cumVal >= 0 ? <ArrowUpRight size={13} className="text-rose-400" /> : <ArrowDownRight size={13} className="text-sky-400" />}
                                        <span className={classNames("text-xs font-black", cumVal >= 0 ? "text-rose-400" : "text-sky-400")}>
                                            {cumVal >= 0 ? `+${cumVal.toFixed(2)}%` : `${cumVal.toFixed(2)}%`}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 토허제 인포그래픽 지도 확대 모달 */}
            {mapModalMode && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={() => setMapModalMode(null)}>
                    <div className="relative bg-[var(--theme-card)] border border-[var(--theme-border)] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--theme-border)]">
                            <span className="text-xs sm:text-sm font-black text-[var(--theme-text)]">
                                🗺️ 동탄·기흥·구리 토허제 3중 규제 지도 ({mapModalMode === 'light' ? '라이트' : '다크'})
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setMapModalMode(mapModalMode === 'light' ? 'dark' : 'light')}
                                    className="px-2 py-1 rounded bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[10px] font-bold text-slate-300"
                                >
                                    {mapModalMode === 'light' ? '다크 전환' : '라이트 전환'}
                                </button>
                                <button onClick={() => setMapModalMode(null)} className="p-1 text-slate-400 hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto p-2 flex-1 bg-slate-950 flex justify-center">
                            <img
                                src={mapModalMode === 'light' ? '/maps/toheo_geographic_light.png' : '/maps/toheo_geographic_dark.png'}
                                alt="토허제 3중 규제 지도"
                                className="max-w-full h-auto rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
