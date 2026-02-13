import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import classNames from 'classnames';
import { Sparkles, Loader2, Repeat } from 'lucide-react';
import { getSignSymbol, getColorClass, getMarketDisplay } from '../utils/stockUtils';

import InvestorTable from './InvestorTable';
import DailyPriceTable from './DailyPriceTable';
import AiAnalysisModal from './AiAnalysisModal';

const ChartWidgetMobile = (props) => {
  const { stock, onExchangeChange, onPeriodChange, currentPeriod, marketMode, logic } = props;
  const { activeTab, setActiveTab, investorsData, dailyPrices, isDataLoaded, setIsDataLoaded, processedChartData, smaData, showAiModal, aiAnalysisContent, isAnalysing, handleAiAnalysis, closeAiModal } = logic;

  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const currentCandleRef = useRef(null);
  const ma5SeriesRef = useRef(null);
  const ma10SeriesRef = useRef(null);
  const ma20SeriesRef = useRef(null);
  const ma60SeriesRef = useRef(null);

  useEffect(() => {
    if (activeTab !== 'chart' || !chartContainerRef.current) return;
    const container = chartContainerRef.current;
    const chart = createChart(container, {
      layout: { background: { type: ColorType.Solid, color: '#0f172a' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      width: container.clientWidth, height: container.clientHeight || 400,
      handleScale: { mouseWheel: true, pinchZoom: true, axisPressedMouseMove: true },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      timeScale: { borderColor: '#334155', timeVisible: true, secondsVisible: false, barSpacing: 6, fixRightEdge: true },
      rightPriceScale: { borderColor: '#334155', autoScale: true, entireTextOnly: true, scaleMargins: { top: 0.15, bottom: 0.35 } },
      localization: { priceFormatter: price => price ? price.toLocaleString() : '' },
    });
    candleSeriesRef.current = chart.addCandlestickSeries({ upColor: '#ef4444', downColor: '#3b82f6', borderVisible: false, wickUpColor: '#ef4444', wickDownColor: '#3b82f6', priceFormat: { type: 'price', precision: 0, minMove: 1 } });
    volumeSeriesRef.current = chart.addHistogramSeries({ color: '#334155', priceFormat: { type: 'volume' }, priceScaleId: 'volume_scale' });
    ma5SeriesRef.current = chart.addLineSeries({ color: '#22c55e', lineWidth: 1, lastValueVisible: false });
    ma10SeriesRef.current = chart.addLineSeries({ color: '#d946ef', lineWidth: 1, lastValueVisible: false });
    ma20SeriesRef.current = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, lastValueVisible: false });
    ma60SeriesRef.current = chart.addLineSeries({ color: '#0ea5e9', lineWidth: 1, lastValueVisible: false });
    chart.priceScale('volume_scale').applyOptions({ scaleMargins: { top: 0.7, bottom: 0.07 } });
    chartRef.current = chart;
    const resizeObserver = new ResizeObserver(entries => { if (chartRef.current) chartRef.current.applyOptions({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }); });
    resizeObserver.observe(container);
    return () => { resizeObserver.disconnect(); chart.remove(); };
  }, [activeTab]);

  // 차트 데이터 렌더링 (가공된 데이터 사용)
  useEffect(() => {
    if (activeTab !== 'chart' || !chartRef.current || !candleSeriesRef.current) return;
    
    // 즉시 초기화
    currentCandleRef.current = null;
    candleSeriesRef.current.setData([]);
    volumeSeriesRef.current.setData([]);
    [ma5SeriesRef, ma10SeriesRef, ma20SeriesRef, ma60SeriesRef].forEach(ref => ref.current && ref.current.setData([]));

    if (processedChartData && processedChartData.length > 0) {
        candleSeriesRef.current.setData(processedChartData);
        volumeSeriesRef.current.setData(processedChartData.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(239, 68, 68, 1.0)' : 'rgba(59, 130, 246, 1.0)' })));
        if (ma5SeriesRef.current) ma5SeriesRef.current.setData(smaData.ma5);
        if (ma10SeriesRef.current) ma10SeriesRef.current.setData(smaData.ma10);
        if (ma20SeriesRef.current) ma20SeriesRef.current.setData(smaData.ma20);
        if (ma60SeriesRef.current) ma60SeriesRef.current.setData(smaData.ma60);
        
        currentCandleRef.current = { ...processedChartData[processedChartData.length - 1] };
        chartRef.current.timeScale().setVisibleLogicalRange({ from: processedChartData.length - 35, to: processedChartData.length });
    }
  }, [processedChartData, activeTab]);

  useEffect(() => {
    if (activeTab !== 'chart' || !candleSeriesRef.current || !currentCandleRef.current || !stock.price || stock.isExpected) return;
    const price = parseFloat(stock.price); const candle = currentCandleRef.current;
    if (price > candle.high) candle.high = price; if (price < candle.low) candle.low = price; candle.close = price;
    candleSeriesRef.current.update(candle);
  }, [stock.price, activeTab]);

  const marketInfo = getMarketDisplay(marketMode);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-slate-800 shadow-xl relative min-h-0">
      <div className="p-2.5 border-b border-slate-800 flex justify-between items-center bg-slate-850 shrink-0">
            <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">{stock.name} <span className="text-xs font-normal text-slate-500">{stock.code}</span></h2>
                <div className={classNames("text-xl font-bold mt-0.5", getColorClass(stock.priceSign))}>
                    {stock.price ? stock.price.toLocaleString() : '-'}
                    <span className="text-xs ml-2 font-medium">{getSignSymbol(stock.priceSign)} {Math.abs(stock.change || 0).toLocaleString()} ({Math.abs(stock.changeRate || 0)}%)</span>
                </div>
            </div>
      </div>
      <div className="flex bg-slate-900 border-b border-slate-800 shrink-0">
        {[ { id: 'chart', name: '차트' }, { id: 'daily', name: '일별' }, { id: 'investors', name: '투자자' } ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={classNames("flex-1 py-2 text-[11px] font-black border-b-2 transition-all", activeTab === tab.id ? "border-indigo-500 text-white bg-slate-800/50" : "border-transparent text-slate-500")}>{tab.name}</button>
        ))}
      </div>
      <div className="flex-1 min-h-0 relative bg-slate-900">
        {activeTab === 'chart' && (
          <div className="flex flex-col h-full">
            <div className="px-2 py-1.5 border-b border-slate-800 bg-slate-900 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
              <button onClick={() => handleAiAnalysis && handleAiAnalysis()} className="flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg shrink-0"><Sparkles size={12} /> AI 분석</button>
              <div className="h-3 w-px bg-slate-700 mx-0.5"></div>
              <button onClick={() => onExchangeChange && onExchangeChange()} className={classNames("flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border shrink-0", marketInfo.colorClass)}><Repeat size={10} /> {marketInfo.name}</button>
              <div className="flex items-center gap-1.5 px-1.5 border-l border-slate-800 shrink-0 ml-0.5">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold"><div className="w-1.5 h-1.5 bg-green-500 rounded-sm"></div>5</div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold"><div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-sm"></div>10</div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold"><div className="w-1.5 h-1.5 bg-amber-500 rounded-sm"></div>20</div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold"><div className="w-1.5 h-1.5 bg-sky-500 rounded-sm"></div>60</div>
              </div>
              <div className="flex gap-1 ml-0.5 border-l border-slate-800 pl-1.5">
                  {['5m', '1D', '1W', '1M'].map(p => ( <button key={p} onClick={() => onPeriodChange && onPeriodChange(p)} className={classNames("px-2 py-1 text-[10px] font-bold rounded-lg transition-all", currentPeriod === p ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-800 text-slate-500 hover:text-slate-300")}>{p}</button> ))}
              </div>
            </div>
            <div className="flex-1 w-full relative">
                <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
                {!isDataLoaded && <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}
            </div>
          </div>
        )}
        {activeTab === 'daily' && (
          <div className="absolute inset-0 flex flex-col">
            <DailyPriceTable prices={dailyPrices} />
          </div>
        )}
        {activeTab === 'investors' && (
          <div className="absolute inset-0 flex flex-col">
            <InvestorTable data={investorsData} isDataLoaded={isDataLoaded} />
          </div>
        )}
      </div>
      <AiAnalysisModal isOpen={showAiModal} onClose={closeAiModal} stockName={stock.name} content={aiAnalysisContent} isAnalysing={isAnalysing} />
    </div>
  );
};

export default ChartWidgetMobile;
