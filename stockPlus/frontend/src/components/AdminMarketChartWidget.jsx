import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { Maximize2, Activity, X, BarChart2, RefreshCw } from 'lucide-react';
import classNames from 'classnames';
import { getAuthHeader, fetchStockChart } from '../api/stockApi';
import { getThemeColors, getSignSymbol } from '../utils/stockUtils';

/**
 * AdminMarketChartWidget (하이브리드 지수 & 주도주 실시간 차트 위젯)
 * - KOSPI (0001) / KOSDAQ (1001) 시장 대표 지수 실시간 모니터링
 * - 테마/업종 히트맵에서 종목 클릭 시 주도주 탭으로 자동 전환 및 실시간 캔들 차트 연동
 * - 단일 차트 인스턴스 유지 및 데이터 부드러운 스위칭 지원
 */
const AdminMarketChartWidget = ({ 
    activeStock = null, 
    onClearActiveStock = () => {}, 
    onExpandModal = () => {} 
}) => {
    // 탭: 'KOSPI' | 'KOSDAQ' | 'STOCK'
    const [activeTab, setActiveTab] = useState('KOSPI');
    const [period, setPeriod] = useState('1D'); // '1D' | '1W'
    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'midnight');
    const [isLoading, setIsLoading] = useState(false);

    // 시세 정보 상태
    const [priceData, setPriceData] = useState({
        code: '0001',
        name: '코스피',
        currentPrice: '0',
        change: '0',
        changeRate: '0.00',
        volume: '0',
        open: '0',
        high: '0',
        low: '0',
        priceSign: '3'
    });

    // 차트 컨테이너 및 인스턴스 Ref
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    const volumeSeriesRef = useRef(null);
    const tooltipRef = useRef(null);
    const isMacroOrIndexRef = useRef(true);

    // 테마 변경 감지
    useEffect(() => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    setTheme(document.documentElement.getAttribute('data-theme') || 'midnight');
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    // 외부에서 activeStock이 들어오면 자동으로 STOCK 탭으로 전환
    useEffect(() => {
        if (activeStock && (activeStock.code || activeStock.stockCode)) {
            setActiveTab('STOCK');
        }
    }, [activeStock]);

    // 1. 차트 인스턴스 단 1회 마운트 시 생성 (Destroy 없이 재사용)
    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        container.innerHTML = '';
        const colors = getThemeColors(theme);

        // 툴팁 엘리먼트 생성
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute z-50 pointer-events-none bg-[var(--theme-header)] opacity-95 backdrop-blur-md border border-[var(--theme-border)] p-2 rounded-xl text-[10px] text-[var(--theme-text)] shadow-2xl hidden transition-colors duration-200';
        tooltip.style.width = '130px';
        container.appendChild(tooltip);
        tooltipRef.current = tooltip;

        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: colors.bg },
                textColor: colors.text,
                fontSize: 10
            },
            grid: {
                vertLines: { color: 'rgba(148, 163, 184, 0.05)' },
                horzLines: { color: 'rgba(148, 163, 184, 0.05)' }
            },
            width: container.clientWidth || 320,
            height: container.clientHeight || 260,
            timeScale: {
                borderColor: colors.border,
                timeVisible: true,
                secondsVisible: false,
                barSpacing: 6,
                fixRightEdge: true
            },
            rightPriceScale: {
                borderColor: colors.border,
                autoScale: true,
                entireTextOnly: true,
                scaleMargins: { top: 0.12, bottom: 0.28 }
            },
            localization: {
                locale: 'ko-KR',
                dateFormat: 'yyyy-MM-dd',
                priceFormatter: price => {
                    if (!price) return '';
                    const isMacro = isMacroOrIndexRef.current;
                    return price.toLocaleString('ko-KR', isMacro ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
                }
            }
        });

        // 툴팁 연동 (시스템 로케일 에러 방지용 수동 포맷)
        chart.subscribeCrosshairMove(param => {
            if (!tooltipRef.current) return;
            if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > container.clientWidth || param.point.y < 0 || param.point.y > container.clientHeight) {
                tooltipRef.current.style.display = 'none';
            } else {
                const data = param.seriesData.get(candleSeriesRef.current);
                const volData = param.seriesData.get(volumeSeriesRef.current);
                if (data) {
                    tooltipRef.current.style.display = 'block';
                    const dateStr = typeof param.time === 'string'
                        ? param.time.replace(/-/g, '.')
                        : (() => {
                            const d = new Date(param.time * 1000);
                            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                        })();
                    const colorClass = data.close >= data.open ? 'text-rose-600' : 'text-blue-600';
                    const isMacro = isMacroOrIndexRef.current;
                    const fmt = val => (val || 0).toLocaleString(undefined, isMacro ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 });
                    
                    tooltipRef.current.innerHTML = `
                        <div class="font-black text-slate-500 mb-1 border-b border-[var(--theme-border)] pb-0.5">${dateStr}</div>
                        <div class="grid grid-cols-2 gap-x-1 gap-y-0.5">
                            <span class="text-slate-500 font-bold">시가</span><span class="text-right font-black">${fmt(data.open)}</span>
                            <span class="text-slate-500 font-bold">고가</span><span class="text-right font-black text-rose-600">${fmt(data.high)}</span>
                            <span class="text-slate-500 font-bold">저가</span><span class="text-right font-black text-blue-600">${fmt(data.low)}</span>
                            <span class="text-slate-500 font-bold">종가</span><span class="text-right font-black ${colorClass}">${fmt(data.close)}</span>
                            <span class="text-slate-500 font-bold border-t border-[var(--theme-border)] pt-0.5">거래</span><span class="text-right font-black border-t border-[var(--theme-border)] pt-0.5">${volData ? (volData.value || 0).toLocaleString() : '-'}</span>
                        </div>
                    `;
                    let left = param.point.x + 10;
                    if (left > container.clientWidth - 135) left = param.point.x - 140;
                    tooltipRef.current.style.left = `${left}px`;
                    tooltipRef.current.style.top = `${param.point.y + 10}px`;
                } else {
                    tooltipRef.current.style.display = 'none';
                }
            }
        });

        // 캔들스틱 시리즈 생성
        candleSeriesRef.current = chart.addCandlestickSeries({
            upColor: '#ef4444',
            downColor: '#3b82f6',
            borderVisible: false,
            wickUpColor: '#ef4444',
            wickDownColor: '#3b82f6',
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01
            }
        });

        // 거래량 시리즈 생성
        volumeSeriesRef.current = chart.addHistogramSeries({
            color: 'rgba(148, 163, 184, 0.25)',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume_scale'
        });
        chart.priceScale('volume_scale').applyOptions({
            scaleMargins: { top: 0.82, bottom: 0 }
        });

        chartRef.current = chart;

        const resizeObserver = new ResizeObserver(entries => {
            if (chartRef.current && entries[0] && entries[0].contentRect.width > 0) {
                chartRef.current.applyOptions({
                    width: entries[0].contentRect.width,
                    height: entries[0].contentRect.height
                });
            }
        });
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
        };
    }, []);

    // 2. 테마 실시간 동기화
    useEffect(() => {
        if (!chartRef.current) return;
        const colors = getThemeColors(theme);
        chartRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: colors.bg },
                textColor: colors.text
            },
            timeScale: { borderColor: colors.border },
            rightPriceScale: { borderColor: colors.border }
        });
    }, [theme]);

    // 3. 데이터 로딩 및 차트 업데이트
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            let targetCode = '0001';
            let exchange = 'IDX';
            let targetName = '코스피';
            const isIndex = (activeTab === 'KOSPI' || activeTab === 'KOSDAQ');
            isMacroOrIndexRef.current = isIndex;

            if (activeTab === 'KOSPI') {
                targetCode = '0001';
                exchange = 'IDX';
                targetName = '코스피';
            } else if (activeTab === 'KOSDAQ') {
                targetCode = '1001';
                exchange = 'IDX';
                targetName = '코스닥';
            } else if (activeTab === 'STOCK' && activeStock) {
                targetCode = activeStock.code || activeStock.stockCode;
                exchange = activeStock.exchangeCode || 'UN';
                targetName = activeStock.name || activeStock.stockName || targetCode;
            }

            // 차트 정밀도 옵션 업데이트
            if (candleSeriesRef.current) {
                candleSeriesRef.current.applyOptions({
                    priceFormat: {
                        type: 'price',
                        precision: isIndex ? 2 : 0,
                        minMove: isIndex ? 0.01 : 1
                    }
                });
            }

            const priceUrl = isIndex
                ? `/api/dashboard/stocks/${targetCode}/price?exchangeCode=IDX`
                : `/api/dashboard/stocks/${targetCode}/price?exchangeCode=${exchange}`;

            const [pRes, cData] = await Promise.all([
                fetch(priceUrl, { headers: getAuthHeader() }),
                fetchStockChart(targetCode, exchange, period)
            ]);

            if (pRes.ok) {
                const pJson = await pRes.json();
                setPriceData({
                    code: targetCode,
                    name: pJson.stockName || targetName,
                    currentPrice: pJson.currentPrice || '0',
                    change: pJson.change || '0',
                    changeRate: pJson.changeRate || '0.00',
                    volume: pJson.volume || '0',
                    open: pJson.open || '0',
                    high: pJson.high || '0',
                    low: pJson.low || '0',
                    priceSign: pJson.priceSign || '3'
                });
            }

            // 차트 캔들 및 거래량 바인딩
            if (Array.isArray(cData) && cData.length > 0 && candleSeriesRef.current && volumeSeriesRef.current) {
                const candles = [];
                const volumes = [];
                const seenTimes = new Set();

                // 시간 오름차순 정렬
                const sorted = [...cData].sort((a, b) => {
                    const tA = a.date ? new Date(a.date).getTime() : Number(a.time);
                    const tB = b.date ? new Date(b.date).getTime() : Number(b.time);
                    return tA - tB;
                });

                sorted.forEach(item => {
                    const timeKey = item.date || Number(item.time);
                    const open = parseFloat(item.open);
                    const high = parseFloat(item.high);
                    const low = parseFloat(item.low);
                    const close = parseFloat(item.close);
                    const vol = parseFloat(item.volume || 0);

                    if (timeKey && !seenTimes.has(timeKey) && close > 0 && !isNaN(open) && !isNaN(high) && !isNaN(low)) {
                        seenTimes.add(timeKey);
                        candles.push({ time: timeKey, open, high, low, close });
                        volumes.push({
                            time: timeKey,
                            value: vol,
                            color: close >= open ? 'rgba(239, 68, 68, 0.45)' : 'rgba(59, 130, 246, 0.45)'
                        });
                    }
                });

                if (candles.length > 0) {
                    candleSeriesRef.current.setData(candles);
                    volumeSeriesRef.current.setData(volumes);

                    if (chartRef.current) {
                        chartRef.current.timeScale().fitContent();
                    }
                }
            }
        } catch (e) {
            console.error(">>> [AdminMarketChartWidget] Load Error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, activeStock, period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const changeVal = parseFloat(String(priceData.change || '0').replace(/,/g, ''));
    const isUp = changeVal > 0;
    const isDown = changeVal < 0;
    const changeColor = isUp ? 'text-rose-600' : (isDown ? 'text-blue-600' : 'text-slate-400');
    const signSymbol = getSignSymbol(priceData.priceSign, priceData.change);

    const isIndex = activeTab === 'KOSPI' || activeTab === 'KOSDAQ';
    const formattedPrice = isIndex 
        ? parseFloat(priceData.currentPrice || 0).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : parseInt(priceData.currentPrice || 0, 10).toLocaleString('ko-KR');

    return (
        <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-3xl p-4 shadow-xl flex flex-col gap-3 h-full min-h-[360px] relative overflow-hidden">
            {/* 상단 탭 및 컨트롤 바 */}
            <div className="flex items-center justify-between gap-1.5 shrink-0 border-b border-[var(--theme-border)] pb-2.5">
                {/* 탭 버튼들 */}
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar-none">
                    <button
                        onClick={() => setActiveTab('KOSPI')}
                        className={classNames(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black tracking-tight transition-all shrink-0 cursor-pointer",
                            activeTab === 'KOSPI'
                                ? "bg-[var(--theme-point)] text-white shadow-md shadow-[var(--theme-point)]/30"
                                : "text-slate-400 hover:text-[var(--theme-text)] bg-[var(--theme-bg)]/60 border border-[var(--theme-border)]"
                        )}
                    >
                        KOSPI
                    </button>
                    <button
                        onClick={() => setActiveTab('KOSDAQ')}
                        className={classNames(
                            "px-2.5 py-1 rounded-xl text-[10px] font-black tracking-tight transition-all shrink-0 cursor-pointer",
                            activeTab === 'KOSDAQ'
                                ? "bg-[var(--theme-point)] text-white shadow-md shadow-[var(--theme-point)]/30"
                                : "text-slate-400 hover:text-[var(--theme-text)] bg-[var(--theme-bg)]/60 border border-[var(--theme-border)]"
                        )}
                    >
                        KOSDAQ
                    </button>
                    {activeStock && (
                        <div
                            onClick={() => setActiveTab('STOCK')}
                            className={classNames(
                                "px-2.5 py-1 rounded-xl text-[10px] font-black tracking-tight transition-all shrink-0 cursor-pointer flex items-center gap-1.5 max-w-[130px]",
                                activeTab === 'STOCK'
                                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                                    : "text-slate-400 hover:text-[var(--theme-text)] bg-[var(--theme-bg)]/60 border border-[var(--theme-border)]"
                            )}
                        >
                            <span className="truncate">{activeStock.name || activeStock.stockName}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClearActiveStock();
                                    setActiveTab('KOSPI');
                                }}
                                className="hover:opacity-75 p-0.5 rounded-full"
                                title="종목 닫기"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    )}
                </div>

                {/* 우측 조작 (주기/새로고침/확대 모달) */}
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => setPeriod(p => p === '1D' ? '1W' : '1D')}
                        className="px-1.5 py-0.5 text-[9px] font-black bg-[var(--theme-bg)] border border-[var(--theme-border)] text-slate-400 hover:text-[var(--theme-text)] rounded-lg transition-colors cursor-pointer"
                        title="주기 변경 (일봉/주봉)"
                    >
                        {period}
                    </button>
                    <button
                        onClick={loadData}
                        disabled={isLoading}
                        className="p-1 text-slate-400 hover:text-[var(--theme-point)] rounded-lg transition-colors cursor-pointer"
                        title="시세 새로고침"
                    >
                        <RefreshCw size={12} className={classNames(isLoading && "animate-spin text-[var(--theme-point)]")} />
                    </button>
                    {activeTab === 'STOCK' && activeStock && (
                        <button
                            onClick={() => onExpandModal(activeStock)}
                            className="p-1 text-slate-400 hover:text-[var(--theme-point)] rounded-lg transition-colors cursor-pointer"
                            title="큰 화면으로 확대 분석 (모달)"
                        >
                            <Maximize2 size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* 시세 요약 헤더 */}
            <div className="flex items-baseline justify-between shrink-0 px-1">
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[var(--theme-text)] truncate">{priceData.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">({priceData.code})</span>
                        <span className="text-[7px] font-black text-[var(--theme-point)] bg-[var(--theme-point)]/10 px-1 py-0.2 rounded border border-[var(--theme-point)]/20 uppercase tracking-tighter">LIVE</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={classNames("text-lg font-black font-mono tracking-tight", changeColor)}>
                            {formattedPrice}
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className={classNames("text-[10px] font-black font-mono", changeColor)}>
                                {signSymbol} {Math.abs(changeVal).toLocaleString('ko-KR', isIndex ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {})}
                            </span>
                            <span className={classNames("text-[10px] font-black font-mono", changeColor)}>
                                ({isUp ? '+' : ''}{priceData.changeRate}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* 거래량 및 고/저가 미니 뱃지 */}
                <div className="text-right flex flex-col items-end shrink-0">
                    <div className="text-[9px] text-slate-400 font-bold">
                        거래량 <span className="text-[var(--theme-text)] font-mono font-black">{parseInt(priceData.volume || 0, 10).toLocaleString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[8px] font-mono">
                        <span className="text-rose-500 font-bold">고 {isIndex ? parseFloat(priceData.high || 0).toFixed(1) : parseInt(priceData.high || 0, 10).toLocaleString('ko-KR')}</span>
                        <span className="text-slate-500">/</span>
                        <span className="text-blue-500 font-bold">저 {isIndex ? parseFloat(priceData.low || 0).toFixed(1) : parseInt(priceData.low || 0, 10).toLocaleString('ko-KR')}</span>
                    </div>
                </div>
            </div>

            {/* 차트 캔버스 영역 */}
            <div className="flex-1 w-full relative min-h-[220px]">
                <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
                {isLoading && (
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none rounded-2xl">
                        <Activity size={20} className="animate-spin text-[var(--theme-point)] opacity-80" />
                    </div>
                )}
            </div>

            {/* 하단 도움말 안내 */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 px-1 shrink-0 pt-1 border-t border-[var(--theme-border)]/50">
                <span className="flex items-center gap-1">
                    <BarChart2 size={11} className="text-[var(--theme-point)]" />
                    <span>{activeTab === 'STOCK' ? '선택 주도주 실시간 차트' : '국내 대표 시장 지수'}</span>
                </span>
                <span className="text-[8px] opacity-70">클릭 시 주도주 즉시 전환</span>
            </div>
        </div>
    );
};

export default AdminMarketChartWidget;
