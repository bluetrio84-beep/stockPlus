import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchStockAnalysis, fetchStockInvestors } from '../api/stockApi';

/**
 * ChartWidget의 비즈니스 로직을 담당하는 커스텀 훅
 */
export const useStockWidget = (stock, currentPeriod) => {
  const [activeTab, setActiveTab] = useState('chart'); 
  const [investorsData, setInvestorsData] = useState({ items: [] });
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiAnalysisContent, setAiAnalysisContent] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  const eventSourceRef = useRef(null);

  // --- 차트 데이터 가공 로직 (UI에서 이쪽으로 이동) ---
  const processedChartData = useMemo(() => {
    const rawData = stock.chartData;
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return null;

    const uniqueData = []; const seen = new Set();
    const sorted = [...rawData].sort((a, b) => Number(a.time) - Number(b.time));
    
    sorted.forEach(d => {
        const t = Number(d.time);
        if (!seen.has(t) && !isNaN(t) && d.close > 0) {
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
    return uniqueData;
  }, [stock.chartData]);

  // 이평선 계산 함수
  const calculateSMA = (data, count) => {
    if (!data) return [];
    return data.map((d, i, arr) => {
        if (i < count - 1) return { time: d.time, value: undefined };
        const sum = arr.slice(i - count + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
        return { time: d.time, value: sum / count };
    }).filter(d => d.value !== undefined);
  };

  const smaData = useMemo(() => {
    if (!processedChartData) return { ma5: [], ma10: [], ma20: [], ma60: [] };
    return {
        ma5: calculateSMA(processedChartData, 5),
        ma10: calculateSMA(processedChartData, 10),
        ma20: calculateSMA(processedChartData, 20),
        ma60: calculateSMA(processedChartData, 60),
    };
  }, [processedChartData]);

  // --- 데이터 로딩 관리 ---
  
  // 종목 변경 시 즉시 로딩 상태로 전환
  useEffect(() => {
    if (stock.code) {
        setIsDataLoaded(false);
    }
  }, [stock.code, currentPeriod]);

  useEffect(() => {
    if (processedChartData) {
        setIsDataLoaded(true);
    }
  }, [processedChartData]);

  // 투자자 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      const code = stock.code || stock.stockCode;
      const exCode = stock.exchangeCode || 'J';
      if (!code || activeTab !== 'investors') return;
      
      setIsDataLoaded(false);
      try {
        const data = await fetchStockInvestors(code, exCode);
        setInvestorsData(data);
      } catch (e) {
        console.error(">>> [Logic] Investor Load Error:", e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, [activeTab, stock.code, stock.exchangeCode]);

  // AI 분석 제어
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

  // 일별 시세 (이건 기존 유지)
  const dailyPrices = useMemo(() => {
    if (!processedChartData) return [];
    const results = processedChartData.map((d, i) => {
      const prevClose = i > 0 ? processedChartData[i-1].close : null;
      const currentClose = d.close;
      const change = prevClose ? currentClose - prevClose : 0;
      const changeRate = prevClose ? (change / prevClose) * 100 : 0;
      let sign = '3';
      if (changeRate >= 29.5) sign = '1'; else if (changeRate > 0) sign = '2';
      else if (changeRate <= -29.5) sign = '4'; else if (changeRate < 0) sign = '5';
      return { date: d.time, close: currentClose, change, changeRate, sign, volume: d.volume };
    });
    return [...results].reverse();
  }, [processedChartData]);

  return {
    activeTab, setActiveTab, investorsData, dailyPrices, isDataLoaded, setIsDataLoaded,
    processedChartData, smaData,
    showAiModal, setShowAiModal, aiAnalysisContent, isAnalysing, handleAiAnalysis, closeAiModal
  };
};
