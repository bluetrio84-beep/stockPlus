import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import classNames from 'classnames';
import { Sparkles, Loader2, Repeat } from 'lucide-react';
import { getSignSymbol, getColorClass, getMarketDisplay, getStockStatusBadge, isKosdaq, getThemeColors } from '../utils/stockUtils';

import InvestorTable from './InvestorTable';
import DailyPriceTable from './DailyPriceTable';
import TraderTable from './TraderTable'; 
import AiAnalysisModal from './AiAnalysisModal';

const ChartWidgetDesktop = (props) => {
  const { stock, onExchangeChange, onPeriodChange, currentPeriod, marketMode, logic } = props;
  const { activeTab, setActiveTab, investorsData, traderData, dailyPrices, isDataLoaded, setIsDataLoaded, processedChartData, smaData, showAiModal, aiAnalysisContent, isAnalysing, handleAiAnalysis, closeAiModal } = logic;

  const chartContainerRef = useRef();
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const currentCandleRef = useRef(null);
  const ma5SeriesRef = useRef(null);
  const ma10SeriesRef = useRef(null);
  const ma20SeriesRef = useRef(null);
  const ma60SeriesRef = useRef(null);

  // [v13.9.1] 테마 변경 시 딜레이 없이 즉각 업데이트하는 Effect
  useEffect(() => {
    if (activeTab !== 'chart' || !chartRef.current) return;
    
    const colors = getThemeColors(logic.theme);

    chartRef.current.applyOptions({
      layout: { 
        background: { type: ColorType.Solid, color: colors.bg }, 
        textColor: colors.text 
      },
      timeScale: { borderColor: colors.border },
      rightPriceScale: { borderColor: colors.border }
    });
  }, [logic.theme, activeTab]);

  useEffect(() => {
    if (activeTab !== 'chart' || !chartContainerRef.current) return;
    const container = chartContainerRef.current;
    
    // 초기 로딩 시 현재 테마 색상 적용
    const colors = getThemeColors(logic.theme);

    const tooltip = document.createElement('div');
    tooltip.className = 'absolute z-50 pointer-events-none bg-[var(--theme-header)] opacity-95 backdrop-blur-md border border-[var(--theme-border)] p-2.5 rounded-lg text-[11px] text-[var(--theme-text)] shadow-2xl hidden transition-colors duration-300';
    tooltip.style.width = '140px';
    container.appendChild(tooltip);

    const chart = createChart(container, {
      layout: { 
        background: { type: ColorType.Solid, color: colors.bg }, 
        textColor: colors.text 
      },
      grid: { 
        vertLines: { color: 'rgba(148, 163, 184, 0.05)' }, 
        horzLines: { color: 'rgba(148, 163, 184, 0.05)' } 
      },
      width: container.clientWidth, 
      height: container.clientHeight || 400,
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false, barSpacing: 6, fixRightEdge: true },
      rightPriceScale: { borderColor: colors.border, autoScale: true, entireTextOnly: true, scaleMargins: { top: 0.15, bottom: 0.35 } },
      localization: { priceFormatter: price => price ? price.toLocaleString() : '' },
    });

    chart.subscribeCrosshairMove(param => {
        if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > container.clientWidth || param.point.y < 0 || param.point.y > container.clientHeight) {
            tooltip.style.display = 'none';
        } else {
            const data = param.seriesData.get(candleSeriesRef.current);
            const volData = param.seriesData.get(volumeSeriesRef.current);
            if (data) {
                tooltip.style.display = 'block';
                const dateStr = currentPeriod === '5m' ? new Date(param.time * 1000).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(param.time * 1000).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
                const colorClass = data.close >= data.open ? 'text-trade-up' : 'text-trade-down';
                tooltip.innerHTML = `<div class="font-black text-slate-500 mb-1.5 border-b border-[var(--theme-border)] pb-1 transition-colors">${dateStr}</div><div class="grid grid-cols-2 gap-x-2 gap-y-1"><span class="text-slate-500 font-bold">시가</span><span class="text-right font-black text-[var(--theme-text)]">${(data.open || 0).toLocaleString()}</span><span class="text-slate-500 font-bold">고가</span><span class="text-right font-black text-trade-up">${(data.high || 0).toLocaleString()}</span><span class="text-slate-500 font-bold">저가</span><span class="text-right font-black text-trade-down">${(data.low || 0).toLocaleString()}</span><span class="text-slate-500 font-bold">종가</span><span class="text-right font-black ${colorClass}">${(data.close || 0).toLocaleString()}</span><span class="text-slate-500 font-bold border-t border-[var(--theme-border)] mt-1 pt-1">거래</span><span class="text-right font-black text-[var(--theme-text)] border-t border-[var(--theme-border)] mt-1 pt-1">${volData ? (volData.value || 0).toLocaleString() : '-'}</span></div>`;
                const y = param.point.y; let left = param.point.x + 15; if (left > container.clientWidth - 150) left = param.point.x - 155;
                tooltip.style.left = left + 'px'; tooltip.style.top = y + 15 + 'px';
            } else tooltip.style.display = 'none';
        }
    });

    candleSeriesRef.current = chart.addCandlestickSeries({ upColor: '#ef4444', downColor: '#3b82f6', borderVisible: false, wickUpColor: '#ef4444', wickDownColor: '#3b82f6', priceFormat: { type: 'price', precision: 0, minMove: 1 } });
    volumeSeriesRef.current = chart.addHistogramSeries({ color: 'rgba(148, 163, 184, 0.2)', priceFormat: { type: 'volume' }, priceScaleId: 'volume_scale' });
    ma5SeriesRef.current = chart.addLineSeries({ color: '#22c55e', lineWidth: 1, lastValueVisible: false });
    ma10SeriesRef.current = chart.addLineSeries({ color: '#d946ef', lineWidth: 1, lastValueVisible: false });
    ma20SeriesRef.current = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, lastValueVisible: false });
    ma60SeriesRef.current = chart.addLineSeries({ color: '#0ea5e9', lineWidth: 1, lastValueVisible: false });
    chart.priceScale('volume_scale').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chartRef.current = chart;
    const resizeObserver = new ResizeObserver(entries => { if (chartRef.current) chartRef.current.applyOptions({ width: entries[0].contentRect.width, height: entries[0].contentRect.height }); });
    resizeObserver.observe(container);
    return () => { resizeObserver.disconnect(); chart.remove(); };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'chart' || !chartRef.current || !candleSeriesRef.current) return;
    currentCandleRef.current = null;
    candleSeriesRef.current.setData([]);
    volumeSeriesRef.current.setData([]);
    [ma5SeriesRef, ma10SeriesRef, ma20SeriesRef, ma60SeriesRef].forEach(ref => ref.current && ref.current.setData([]));
    if (processedChartData && processedChartData.length > 0) {
        candleSeriesRef.current.setData(processedChartData);
        volumeSeriesRef.current.setData(processedChartData.map(d => ({ time: d.time, value: d.volume, color: d.close >= d.open ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)' })));
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
    <div id="stock-chart-area" className="w-full h-full flex flex-col bg-[var(--theme-header)] rounded-lg overflow-hidden border border-[var(--theme-border)] shadow-xl relative min-h-0 transition-colors duration-500 font-sans text-[var(--theme-text)]">
      <div className="p-4 border-b border-[var(--theme-border)] flex justify-between items-center bg-[var(--theme-header)] shrink-0 transition-colors duration-500">
            <div>
                <h2 className="text-lg font-bold text-[var(--theme-text)] flex items-center gap-2 transition-colors">
                    {stock.name}
                    {isKosdaq(stock) && <span className="text-[var(--theme-point)] -ml-1 transition-colors">*</span>}
                    {getStockStatusBadge(stock) && (
                        <span className={classNames("text-xs px-1.5 py-0.5 rounded border leading-tight transition-colors", getStockStatusBadge(stock).color)}>
                            {getStockStatusBadge(stock).label}
                        </span>
                    )}
                    <span className="text-sm font-normal text-slate-500 flex items-center gap-2 transition-colors">
                        {stock.code}
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-[var(--theme-bg)]/50 px-1.5 py-0.5 rounded transition-colors">
                            {stock.marketName || (isKosdaq(stock) ? 'KOSDAQ' : 'KOSPI')}
                            {stock.indexName && <span className="text-[var(--theme-point)]/90 transition-colors">{stock.indexName.replace('KOSPI ', '').replace('KOSDAQ ', '')}</span>}
                        </span>
                        {stock.aiScore !== undefined && stock.aiScore !== null && (
                            <span className={classNames("text-[10px] font-black px-2 py-0.5 rounded-full border leading-tight flex items-center gap-1.5 shadow-sm transition-all transition-colors", 
                                stock.aiScore >= 80 ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : 
                                (stock.aiScore >= 50 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-[var(--theme-point)]/10 text-[var(--theme-point)] border-[var(--theme-point)]/20")
                            )}>
                                <span className={classNames("w-1.5 h-1.5 rounded-full transition-colors", 
                                    stock.aiScore >= 90 ? "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" : 
                                    (stock.aiScore >= 80 ? "bg-rose-400 shadow-[0_0_5px_rgba(244,63,94,0.5)]" : 
                                    (stock.aiScore >= 50 ? "bg-amber-400 animate-pulse" : "bg-[var(--theme-point)]"))
                                )}></span>
                                AI {Math.round(stock.aiScore)}
                            </span>
                        )}
                    </span>
                </h2>
                <div className={classNames("text-2xl font-bold mt-1 transition-colors", getColorClass(stock.priceSign, stock.change))}>
                    {stock.price ? stock.price.toLocaleString() : '-'}
                    <span className="text-sm ml-2 font-medium transition-colors">{getSignSymbol(stock.priceSign, stock.change)} {Math.abs(stock.change || 0).toLocaleString()} ({Math.abs(stock.changeRate || 0)}%)</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-[11px] transition-colors">
                <div className="flex items-center gap-4 transition-colors">
                    <div className="flex flex-col items-end transition-colors"><span className="text-slate-500 opacity-80">전일</span><span className="font-bold text-[var(--theme-text)] transition-colors">{parseFloat(stock.prevClose || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end transition-colors"><span className="text-slate-500 opacity-80">시가</span><span className="font-bold text-[var(--theme-text)] transition-colors">{parseFloat(stock.open || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end transition-colors"><span className="text-trade-up opacity-80">고가</span><span className="font-bold text-trade-up transition-colors">{parseFloat(stock.high || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end transition-colors"><span className="text-trade-down opacity-80">저가</span><span className="font-bold text-trade-down transition-colors">{parseFloat(stock.low || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end transition-colors"><span className="text-slate-500 opacity-80">거래량</span><span className="font-bold text-[var(--theme-text)] transition-colors">{parseFloat(stock.volume || 0).toLocaleString()}</span></div>
                </div>
                <div className="flex items-center gap-4 border-t border-[var(--theme-border)]/50 pt-1.5 transition-colors">
                    <div className="flex flex-col items-end transition-colors"><span className="text-slate-500 opacity-80">시총</span><span className="font-bold text-[var(--theme-text)] transition-colors">{parseFloat(stock.marketCap || 0).toLocaleString()}억</span></div>
                    <div className="flex flex-col items-end transition-colors"><span className="text-slate-500 opacity-80">상장주식</span><span className="font-bold text-[var(--theme-text)] transition-colors">{parseFloat(stock.listedShares || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end transition-colors"><span className="text-trade-up opacity-60">52주 최고</span><span className="font-bold text-trade-up transition-colors">{parseFloat(stock.high52w || 0).toLocaleString()}</span></div>
                    <div className="flex flex-col items-end transition-colors"><span className="text-trade-down opacity-60">52주 최저</span><span className="font-bold text-trade-down transition-colors">{parseFloat(stock.low52w || 0).toLocaleString()}</span></div>
                </div>
            </div>
      </div>
      <div className="flex bg-[var(--theme-header)] border-b border-[var(--theme-border)] shrink-0 transition-colors duration-500">
        {[ { id: 'chart', name: '차트' }, { id: 'daily', name: '일별' }, { id: 'investors', name: '투자자' }, { id: 'traders', name: '거래원' } ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={classNames("flex-1 py-2 text-xs font-black border-b-2 transition-all transition-colors", activeTab === tab.id ? "border-[var(--theme-point)] text-[var(--theme-text)] bg-[var(--theme-bg)]/50" : "border-transparent text-slate-500 hover:text-[var(--theme-text)]")}>{tab.name}</button>
        ))}
      </div>
      <div className="flex-1 min-h-0 relative bg-[var(--theme-header)] transition-colors duration-500">
        {activeTab === 'chart' && (
          <div className="flex flex-col h-full transition-colors">
            <div className="px-3 py-2 border-b border-[var(--theme-border)] bg-[var(--theme-header)] flex items-center gap-2 shrink-0 transition-colors duration-500">
              <button onClick={() => handleAiAnalysis && handleAiAnalysis()} className="flex items-center gap-1.5 text-xs font-black text-yellow-600 bg-yellow-500/10 px-3 py-1.5 rounded-xl hover:bg-yellow-500/20 transition-all shadow-sm shrink-0 transition-colors"><Sparkles size={14} /> AI 분석</button>
              <div className="h-4 w-px bg-[var(--theme-border)] mx-1 transition-colors"></div>
              <button onClick={() => onExchangeChange && onExchangeChange()} className={classNames("flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl border transition-all shrink-0 shadow-sm transition-colors", marketInfo.colorClass.replace('600/10', '600/20'))}><Repeat size={10} /> {marketInfo.name}</button>
              <div className="flex items-center gap-3 px-3 border-l border-[var(--theme-border)] shrink-0 ml-1 transition-colors">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-black transition-colors"><div className="w-2 h-2 bg-green-500 rounded-sm"></div>5</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-black transition-colors"><div className="w-2 h-2 bg-fuchsia-500 rounded-sm"></div>10</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-black transition-colors"><div className="w-2 h-2 bg-amber-500 rounded-sm"></div>20</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-black transition-colors"><div className="w-2 h-2 bg-sky-500 rounded-sm"></div>60</div>
              </div>
              <div className="flex gap-1.5 ml-auto border-l border-[var(--theme-border)] pl-4 transition-colors">
                  {['5m', '1D', '1W', '1M'].map(p => ( <button key={p} onClick={() => onPeriodChange && onPeriodChange(p)} className={classNames("px-3 py-1.5 text-[10px] font-black rounded-xl transition-all transition-colors", currentPeriod === p ? "bg-[var(--theme-point)] text-white shadow-lg shadow-[var(--theme-point)]/20" : "bg-[var(--theme-bg)] text-slate-500 hover:text-[var(--theme-text)] border border-[var(--theme-border)]")}>{p}</button> ))}
              </div>
            </div>
            <div className="flex-1 w-full relative transition-colors">
                <div ref={chartContainerRef} className="w-full h-full absolute inset-0 transition-colors" />
                {!isDataLoaded && <div className="absolute inset-0 flex items-center justify-center bg-[var(--theme-header)]/50 z-10 backdrop-blur-sm transition-colors"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>}
            </div>
          </div>
        )}
        {activeTab === 'daily' && (
          <div className="absolute inset-0 flex flex-col transition-colors">
            <DailyPriceTable prices={dailyPrices} />
          </div>
        )}
        {activeTab === 'investors' && (
          <div className="absolute inset-0 flex flex-col transition-colors">
            <InvestorTable data={investorsData} isDataLoaded={isDataLoaded} />
          </div>
        )}
        {activeTab === 'traders' && (
          <div className="absolute inset-0 flex flex-col transition-colors">
            <TraderTable traderData={traderData} />
          </div>
        )}
      </div>
      <AiAnalysisModal isOpen={showAiModal} onClose={closeAiModal} stockName={stock.name} content={aiAnalysisContent} isAnalysing={isAnalysing} />
    </div>
  );
};

export default ChartWidgetDesktop;
