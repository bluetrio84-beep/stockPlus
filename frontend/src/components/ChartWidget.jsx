import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import classNames from 'classnames';
import { Sparkles, X, Loader2, AlertCircle, Repeat } from 'lucide-react';
import { fetchStockAnalysis } from '../api/stockApi';
import { getSignSymbol, getColorClass, getMarketDisplay } from '../utils/stockUtils';

const ChartWidget = ({ stock, onExchangeChange, onPeriodChange, currentPeriod, marketMode }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const currentCandleRef = useRef(null);

  const ma5SeriesRef = useRef(null);
  const ma10SeriesRef = useRef(null);
  const ma20SeriesRef = useRef(null);
  
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiAnalysisContent, setAiAnalysisContent] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const eventSourceRef = useRef(null);

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const container = chartContainerRef.current;

    // 툴팁 엘리먼트 생성 및 관리
    const tooltip = document.createElement('div');
    tooltip.className = 'absolute z-50 pointer-events-none bg-slate-800/90 backdrop-blur-md border border-slate-700 p-2.5 rounded-lg text-[11px] text-slate-200 shadow-2xl hidden';
    tooltip.style.width = '140px';
    container.appendChild(tooltip);

    const chart = createChart(container, {
      layout: { background: { type: ColorType.Solid, color: '#0f172a' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      width: container.clientWidth,
      height: container.clientHeight || 400,
      handleScale: {
        mouseWheel: true,
        pinchZoom: true, // 핀치 줌 활성화
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true, // 터치 스크롤 활성화
        vertTouchDrag: true,
      },
      timeScale: { 
        borderColor: '#334155', 
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,
        barSpacing: 6,
      },
      rightPriceScale: { 
        borderColor: '#334155',
        autoScale: true,
        entireTextOnly: true,
        scaleMargins: {
            top: 0.15,
            bottom: 0.35,
        }
      },
      localization: {
        priceFormatter: price => price.toLocaleString(),
      },
    });

    // 크로스헤어 이동 시 툴팁 업데이트 로직
    chart.subscribeCrosshairMove(param => {
        if (
            param.point === undefined ||
            !param.time ||
            param.point.x < 0 ||
            param.point.x > container.clientWidth ||
            param.point.y < 0 ||
            param.point.y > container.clientHeight
        ) {
            tooltip.style.display = 'none';
        } else {
            const data = param.seriesData.get(candleSeriesRef.current);
            const volData = param.seriesData.get(volumeSeriesRef.current);
            
            if (data) {
                tooltip.style.display = 'block';
                const dateStr = currentPeriod === '5m' 
                    ? new Date(param.time * 1000).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : new Date(param.time * 1000).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
                
                const colorClass = data.close >= data.open ? 'text-trade-up' : 'text-trade-down';
                
                tooltip.innerHTML = `
                    <div class="font-black text-slate-400 mb-1 border-b border-slate-700 pb-1">${dateStr}</div>
                    <div class="grid grid-cols-2 gap-x-2 gap-y-0.5">
                        <span class="text-slate-500">시가</span><span class="text-right font-bold">${data.open.toLocaleString()}</span>
                        <span class="text-slate-500">고가</span><span class="text-right font-bold text-trade-up">${data.high.toLocaleString()}</span>
                        <span class="text-slate-500">저가</span><span class="text-right font-bold text-trade-down">${data.low.toLocaleString()}</span>
                        <span class="text-slate-500">종가</span><span class="text-right font-bold ${colorClass}">${data.close.toLocaleString()}</span>
                        <span class="text-slate-500">거래</span><span class="text-right font-bold text-slate-300">${volData ? volData.value.toLocaleString() : '-'}</span>
                    </div>
                `;

                const y = param.point.y;
                let left = param.point.x + 15;
                if (left > container.clientWidth - 150) {
                    left = param.point.x - 155;
                }
                tooltip.style.left = left + 'px';
                tooltip.style.top = y + 15 + 'px';
            } else {
                tooltip.style.display = 'none';
            }
        }
    });

    candleSeriesRef.current = chart.addCandlestickSeries({
      upColor: '#ef4444', downColor: '#3b82f6', borderVisible: false,
      wickUpColor: '#ef4444', wickDownColor: '#3b82f6',
      priceFormat: {
        type: 'price',
        precision: 0,
        minMove: 1,
      },
    });

    volumeSeriesRef.current = chart.addHistogramSeries({
      color: '#334155', 
      priceFormat: { type: 'volume' }, 
      priceScaleId: 'volume_scale',
    });

    ma5SeriesRef.current = chart.addLineSeries({ color: '#22c55e', lineWidth: 1, lastValueVisible: false });
    ma10SeriesRef.current = chart.addLineSeries({ color: '#d946ef', lineWidth: 1, lastValueVisible: false });
    ma20SeriesRef.current = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, lastValueVisible: false });

    // [수정] 거래량 스케일 조정 (PC는 바닥에 붙이고, 모바일은 살짝 띄움)
    const isMobile = window.innerWidth < 1024;
    chart.priceScale('volume_scale').applyOptions({ 
        scaleMargins: { 
            top: 0.7, 
            bottom: isMobile ? 0.07 : 0 // 0.08에서 0.07로 미세 하향
        } 
    });
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver(entries => {
        if (chartRef.current && entries[0].contentRect.width > 0) {
            chartRef.current.applyOptions({ width: entries[0].contentRect.width, height: entries[0].contentRect.height });
        }
    });
    resizeObserver.observe(container);

    return () => { resizeObserver.disconnect(); chart.remove(); };
  }, []);

  // 2. Historical Data Handling
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;
    
    setIsDataLoaded(false);

    // [추가] 종목 변경 시 이전 데이터 즉시 초기화
    candleSeriesRef.current.setData([]);
    volumeSeriesRef.current.setData([]);
    ma5SeriesRef.current.setData([]);
    ma10SeriesRef.current.setData([]);
    ma20SeriesRef.current.setData([]);

    const rawData = stock.chartData;
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        setIsDataLoaded(true);
        return;
    }

    try {
        const uniqueData = [];
        const seen = new Set();
        const sortedData = [...rawData].sort((a, b) => Number(a.time) - Number(b.time));
        
        sortedData.forEach(d => {
            const t = Number(d.time); 
            if (!seen.has(t) && !isNaN(t)) {
                uniqueData.push({
                    time: t,
                    open: Number(d.open),
                    high: Number(d.high),
                    low: Number(d.low),
                    close: Number(d.close),
                    volume: Number(d.volume || 0)
                });
                seen.add(t);
            }
        });

        if (uniqueData.length > 0) {
            candleSeriesRef.current.setData(uniqueData);
            volumeSeriesRef.current.setData(uniqueData.map(d => ({
                time: d.time,
                value: d.volume,
                color: d.close >= d.open ? 'rgba(239, 68, 68, 1.0)' : 'rgba(59, 130, 246, 1.0)'
            })));
            ma5SeriesRef.current.setData(calculateSMA(uniqueData, 5));
            ma10SeriesRef.current.setData(calculateSMA(uniqueData, 10));
            ma20SeriesRef.current.setData(calculateSMA(uniqueData, 20));
            currentCandleRef.current = { ...uniqueData[uniqueData.length - 1] };
            chartRef.current.timeScale().fitContent();
        }
    } catch (err) {
        console.error("Chart Rendering Error:", err);
    } finally {
        setIsDataLoaded(true);
    }
  }, [stock.chartData, stock.code]);

  // 3. Realtime Updates
  useEffect(() => {
    if (!chartRef.current || !currentCandleRef.current || !stock.price || stock.isExpected) return;
    const price = parseFloat(stock.price);
    const candle = currentCandleRef.current;
    if (price > candle.high) candle.high = price;
    if (price < candle.low) candle.low = price;
    candle.close = price;
    candleSeriesRef.current.update(candle);
  }, [stock.price]);

  const handleAiAnalysis = () => {
    if (isAnalysing) return;
    setShowAiModal(true); setAiAnalysisContent(''); setIsAnalysing(true);
    const closeEs = fetchStockAnalysis(stock.code, (chunk) => {
        setAiAnalysisContent(prev => prev + chunk.replaceAll("\\n", "\n"));
        if (chunk.includes("[완료]") || chunk.includes("[에러]")) setIsAnalysing(false);
    });
    eventSourceRef.current = { close: closeEs };
  };

  const closeAiModal = () => {
    setShowAiModal(false);
    if (eventSourceRef.current) eventSourceRef.current.close();
    setIsAnalysing(false);
  };

  const marketInfo = getMarketDisplay(marketMode);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-xl relative">
      {/* Header */}
      <div className="p-2.5 lg:p-4 border-b border-slate-800 flex justify-between items-center bg-slate-850 shrink-0">
            <div>
                <h2 className="text-base lg:text-lg font-bold text-slate-100 flex items-center gap-2">
                    {stock.name} <span className="text-xs lg:text-sm font-normal text-slate-500">{stock.code}</span>
                </h2>
                <div className={classNames("text-xl lg:text-2xl font-bold mt-0.5 lg:mt-1", getColorClass(stock.priceSign))}>
                    {stock.price ? stock.price.toLocaleString() : '-'}
                    <span className="text-xs lg:text-sm ml-2 font-medium">{getSignSymbol(stock.priceSign)} {Math.abs(stock.change || 0).toLocaleString()} ({Math.abs(stock.changeRate || 0)}%)</span>
                </div>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-2 text-[11px]">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end"><span className="text-slate-500">전일</span><span className="font-bold text-slate-300">{parseFloat(stock.prevClose || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end"><span className="text-slate-500">시가</span><span className="font-bold text-slate-300">{parseFloat(stock.open || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end"><span className="text-trade-up opacity-80">고가</span><span className="font-bold text-trade-up">{parseFloat(stock.high || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end"><span className="text-trade-down opacity-80">저가</span><span className="font-bold text-trade-down">{parseFloat(stock.low || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end"><span className="text-slate-500">거래량</span><span className="font-bold text-slate-300">{parseFloat(stock.volume || 0).toLocaleString()}</span></div>
                </div>
                <div className="flex items-center gap-4 border-t border-slate-800/50 pt-1.5">
                    <div className="flex flex-col items-end"><span className="text-slate-500">시총</span><span className="font-bold text-slate-300">{parseFloat(stock.marketCap || 0).toLocaleString()}억</span></div>
                    <div className="flex flex-col items-end"><span className="text-slate-500">상장주식</span><span className="font-bold text-slate-300">{parseFloat(stock.listedShares || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end"><span className="text-trade-up opacity-60">52주 최고</span><span className="font-bold text-trade-up">{parseFloat(stock.high52w || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end"><span className="text-trade-down opacity-60">52주 최저</span><span className="font-bold text-trade-down">{parseFloat(stock.low52w || 0).toLocaleString()}</span></div>
                </div>
            </div>
      </div>

      {/* Toolbar - 반응형 적용 (모바일: 작게 / PC: 크게) */}
      <div className="px-2 py-1.5 lg:px-3 lg:py-2 border-b border-slate-800 bg-slate-900 flex items-center gap-1 lg:gap-2 overflow-x-auto no-scrollbar shrink-0">
        <button onClick={handleAiAnalysis} className="flex items-center gap-1 lg:gap-1.5 text-[10px] lg:text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg hover:bg-yellow-400/20 transition-colors shrink-0">
            <Sparkles className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> AI 분석
        </button>
        
        <div className="h-3 lg:h-4 w-px bg-slate-700 mx-0.5 lg:mx-1"></div>
        
        <button 
            onClick={() => onExchangeChange && onExchangeChange()} 
            className={classNames("flex items-center gap-1 lg:gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 text-[10px] lg:text-xs font-bold rounded-lg border transition-all shrink-0 shadow-sm", marketInfo.colorClass)}
        >
            <Repeat size={10} />
            {marketInfo.name}
        </button>

        <div className="flex items-center gap-1.5 lg:gap-2.5 px-1.5 lg:px-2.5 border-l border-slate-800 shrink-0 ml-0.5 lg:ml-1">
            <div className="flex items-center gap-1 lg:gap-1.5 text-[9px] lg:text-[11px] text-slate-400 font-bold"><div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-sm"></div>5</div>
            <div className="flex items-center gap-1 lg:gap-1.5 text-[9px] lg:text-[11px] text-slate-400 font-bold"><div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-fuchsia-500 rounded-sm"></div>10</div>
            <div className="flex items-center gap-1 lg:gap-1.5 text-[9px] lg:text-[11px] text-slate-400 font-bold"><div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-amber-500 rounded-sm"></div>20</div>
        </div>

        <div className="flex gap-1 lg:gap-1.5 ml-0.5 lg:ml-1 border-l border-slate-800 pl-1.5 lg:pl-2.5">
            {['5m', '1D', '1W', '1M'].map(p => (
                <button key={p} onClick={() => onPeriodChange && onPeriodChange(p)} className={classNames("px-2 py-1 lg:px-3 lg:py-1.5 text-[10px] lg:text-xs font-bold rounded-lg transition-all", { "bg-indigo-600 text-white shadow-lg": currentPeriod === p, "bg-slate-800 text-slate-500 hover:text-slate-300": currentPeriod !== p })}>{p}</button>
            ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 w-full relative min-h-[300px] lg:min-h-[400px] flex-grow">
          <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
          {!isDataLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
              </div>
          )}
          {isDataLoaded && (!stock.chartData || stock.chartData.length === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 text-slate-500 gap-2">
                  <AlertCircle size={24} />
                  <span className="text-sm font-medium">
                      {marketMode === 'NX' ? 'NXT 데이터를 제공하지 않는 종목입니다.' : '차트 데이터가 없습니다.'}
                  </span>
              </div>
          )}
      </div>

      {/* AI Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-850">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold"><Sparkles size={20} /> <span>{stock.name} AI 투자 전략</span></div>
                    <button onClick={closeAiModal} className="p-1 hover:bg-slate-800 rounded-full text-slate-400"><X size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/30">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-slate-300 font-sans">
                        {aiAnalysisContent || (isAnalysing && "데이터 수집 및 분석 중...")}
                        {isAnalysing && <span className="inline-block w-1.5 h-4 ml-1 bg-yellow-400 animate-pulse"></span>}
                    </div>
                </div>
                <div className="p-4 border-t border-slate-800 text-right bg-slate-900">
                    <button onClick={closeAiModal} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">확인</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const calculateSMA = (data, count) => data.map((d, i, arr) => {
    if (i < count - 1) return { time: d.time };
    const sum = arr.slice(i - count + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
    return { time: d.time, value: sum / count };
}).filter(d => d.value !== undefined);

export default ChartWidget;