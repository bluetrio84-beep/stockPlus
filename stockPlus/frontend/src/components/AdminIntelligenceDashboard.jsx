import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Zap, PieChart, Activity, Sparkles, Target, ChevronLeft, ChevronRight, X, Brain, Gauge, ArrowUpRight, Anchor, ArrowUpCircle, ArrowDownCircle, HelpCircle, Info, Loader2, Compass, Navigation, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getAuthHeader, fetchStockChart } from '../api/stockApi';
import classNames from 'classnames';
import ChartWidget from './ChartWidget';

import { useNavigate } from 'react-router-dom';

const AdminIntelligenceDashboard = () => {
    const navigate = useNavigate();

    // ... (보안 로직 유지) ...

    const [data, setData] = useState({ heatmap: [], persistence: [], leaders: [], breadth: {}, aiSignals: [], hitRate: 0 });
    const [compassData, setCompassData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('monitor'); // 'monitor' | 'strategy' | 'compass' 
    const [mobileTab, setMobileTab] = useState('overview'); 
    const [pollInterval, setPollInterval] = useState(180000);
    const [selectedSector, setSelectedSector] = useState(null);
    const [helpModal, setHelpModal] = useState(null); 
    
    // [v16.39.3] 차트 모달 연동 상태 (객체로 관리)
    const [selectedStock, setSelectedStock] = useState(null);
    const [isSearchingCode, setIsSearchingCode] = useState(false);

    // [v16.39.4] 페이지네이션 변수 복구
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const handleStockClick = async (e, rawStockName) => {
        if (e) e.preventDefault();
        try {
            setIsSearchingCode(true);
            const cleanName = rawStockName.split('(')[0].trim();
            
            const res = await fetch(`/api/stocks/search?keyword=${encodeURIComponent(cleanName)}`, { headers: getAuthHeader() });
            if (res.ok) {
                const results = await res.json();
                if (Array.isArray(results) && results.length > 0) {
                    // [v16.39.6] CamelCase 필드명 적용 (stockCode, stockName)
                    const exactMatch = results.find(s => s.stockName === cleanName);
                    const found = exactMatch || results[0];
                    
                    // [v16.39.7] 차트 데이터 및 실시간 시세 통합 Fetch
                    const [chartData, priceRes] = await Promise.all([
                        fetchStockChart(found.stockCode, 'UN', '1D'),
                        fetch(`/api/dashboard/stocks/${found.stockCode}/price?exchangeCode=UN`, { headers: getAuthHeader() })
                    ]);
                    
                    let priceData = {};
                    if (priceRes.ok) priceData = await priceRes.json();
                    
                    // ChartWidget 활성화를 위한 객체 구성
                    setSelectedStock({
                        ...found,
                        code: found.stockCode,
                        name: found.stockName,
                        chartData: chartData,
                        exchangeCode: 'UN',
                        // [v16.39.8] UI 컴포넌트(ChartWidget) 기대 규격으로 최종 정밀 매핑
                        price: parseFloat(priceData.currentPrice || 0), // currentPrice -> price
                        currentPrice: parseFloat(priceData.currentPrice || 0),
                        prevClose: parseFloat(priceData.prevClose || 0),
                        open: parseFloat(priceData.open || 0),
                        high: parseFloat(priceData.high || 0),
                        low: parseFloat(priceData.low || 0),
                        volume: parseInt(priceData.volume || 0),
                        change: parseFloat(priceData.change || 0),
                        changeRate: parseFloat(priceData.changeRate || 0),
                        marketCap: parseFloat(priceData.marketCap || 0),
                        listedShares: parseFloat(priceData.listedShares || 0),
                        high52w: parseFloat(priceData.high52w || 0),
                        low52w: parseFloat(priceData.low52w || 0),
                        priceSign: priceData.priceSign || '3',
                        sign: priceData.priceSign || '3' // priceSign -> sign
                    });
                } else {
                    alert(`'${cleanName}' 종목 정보를 찾을 수 없습니다.`);
                }
            }
        } catch (e) {
            console.error("Stock Search Error:", e);
        } finally {
            setIsSearchingCode(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/collector/config', { headers: getAuthHeader() });
            if (res.ok) {
                const cfg = await res.json();
                if (cfg.collect_interval) setPollInterval(cfg.collect_interval * 1000); 
            }
        } catch (e) {}
    };

    const fetchIntelData = async () => {
        try {
            const res = await fetch('/api/admin/intelligence/dashboard', { headers: getAuthHeader() });
            if (res.ok) setData(await res.json());
        } catch (e) {} 
        finally { setIsLoading(false); }
    };

    const fetchCompassData = async () => {
        try {
            const res = await fetch('/api/admin/intelligence/market-compass', { headers: getAuthHeader() });
            if (res.ok) setCompassData(await res.json());
        } catch (e) {
            console.error("Compass Fetch Error:", e);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchIntelData();
        fetchCompassData();
    }, []);

    useEffect(() => {
        if (!pollInterval) return;
        const interval = setInterval(() => {
            fetchIntelData();
            fetchCompassData();
        }, pollInterval); 
        return () => clearInterval(interval);
    }, [pollInterval]);

    const totalPages = Math.ceil((data.persistence?.length || 0) / itemsPerPage);
    const paginatedThemes = data.persistence?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getHeatmapColor = (rate) => {
        const val = parseFloat(rate);
        if (val > 2.5) return 'bg-rose-600 shadow-lg shadow-rose-900/40';
        if (val > 1.0) return 'bg-rose-500';
        if (val > 0) return 'bg-rose-400';
        if (val < -2.5) return 'bg-blue-600 shadow-lg shadow-blue-900/40';
        if (val < -1.0) return 'bg-blue-500';
        if (val < 0) return 'bg-blue-400';
        return 'bg-slate-700';
    };

    const getScoreColor = (score) => {
        const val = parseInt(score);
        if (val >= 100) return { text: 'text-rose-600', bg: 'bg-rose-500', border: 'border-rose-500/30', lightBg: 'bg-rose-500/10' };
        if (val >= 95) return { text: 'text-cyan-600', bg: 'bg-cyan-500', border: 'border-cyan-500/30', lightBg: 'bg-cyan-500/10' };
        if (val >= 90) return { text: 'text-indigo-600', bg: 'bg-indigo-500', border: 'border-indigo-500/30', lightBg: 'bg-indigo-500/10' };
        if (val >= 85) return { text: 'text-amber-600', bg: 'bg-amber-500', border: 'border-amber-500/30', lightBg: 'bg-amber-500/10' };
        if (val >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', border: 'border-emerald-500/30', lightBg: 'bg-emerald-500/10' };
        return { text: 'text-slate-500', bg: 'bg-slate-500', border: 'border-slate-500/30', lightBg: 'bg-slate-500/10' };
    };

    const renderSupplyHelp = () => (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setHelpModal(null)}></div>
            <div className="relative w-full max-w-md bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-[32px] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><Sparkles className="text-[var(--theme-point)]" size={20} /> AI 수급 점수 가이드</h3>
                    <button onClick={() => setHelpModal(null)} className="p-1.5 bg-[var(--theme-bg)] rounded-full text-slate-500 transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 transition-colors">
                    {[
                        { score: '100%', title: 'Mega Foreign Bomb', desc: '외국인이 단독으로 20억 이상의 자금을 쏟아붓는 주도주 신호입니다.', color: 'rose' },
                        { score: '95%', title: 'Foreign Power Buy', desc: '외국인 순매수가 10억을 돌파하며 강력한 상승 에너지가 분출된 상태입니다.', color: 'cyan' },
                        { score: '90%', title: 'Foreign Smart Entry', desc: '외국인의 매집이 5억 이상 포착되어 추세 전환이 기대되는 스마트 수급입니다.', color: 'indigo' },
                        { score: '85%', title: 'Foreign Window Pick', desc: '특정 외국계 창구를 통해 의미 있는 물량이 유입되기 시작한 신호입니다.', color: 'amber' },
                        { score: '80%', title: 'Foreign Bull Ride', desc: '외국인 수급과 차트 흐름이 조화를 이루며 안정적인 상승 궤도에 진입한 상태입니다.', color: 'emerald' }
                    ].map((item, i) => (
                        <div key={i} className={`bg-[var(--theme-bg)] p-4 rounded-2xl border border-${item.color}-500/20 transition-colors`}>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-black bg-${item.color}-500 text-white px-2 py-0.5 rounded-full`}>{item.score}</span>
                                <span className={`text-xs font-black text-${item.color}-600 uppercase`}>{item.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold leading-relaxed transition-colors">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderHitRateHelp = () => (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setHelpModal(null)}></div>
            <div className="relative w-full max-w-md bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-[32px] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 transition-colors">
                    <h3 className="text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><TrendingUp className="text-emerald-600" size={20} /> AI 예측 적중률 가이드</h3>
                    <button onClick={() => setHelpModal(null)} className="p-1.5 bg-[var(--theme-bg)] rounded-full text-slate-500 transition-colors"><X size={18} /></button>
                </div>
                <div className="bg-[var(--theme-bg)] transition-colors p-5 rounded-2xl border border-emerald-500/20 leading-relaxed transition-colors">
                    <p className="text-xs text-slate-500 font-black mb-3 transition-colors">[산출 공식]</p>
                    <p className="text-sm text-[var(--theme-text)] font-bold mb-4 transition-colors">최근 7일 동안 AI가 <span className="text-rose-600 font-black transition-colors"> '매수(BUY)'</span> 신호를 발생시킨 주도 업종들 중에서, <span className="text-emerald-600 font-black transition-colors">현재 실시간 주가가 실제로 상승(+) 중인 비율</span>을 의미합니다.</p>
                    <p className="text-[11px] text-slate-500 italic font-medium transition-colors">"이 수치가 높을수록 AI의 최근 트렌드 예측이 현재 시장의 수급 흐름과 정확히 일치하고 있음을 나타냅니다."</p>
                </div>
            </div>
        </div>
    );

    const renderGaugeHelp = () => (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setHelpModal(null)}></div>
            <div className="relative w-full max-w-md bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-[32px] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><Brain className="text-indigo-600" size={20} /> 인텔리전스 게이지 가이드</h3>
                    <button onClick={() => setHelpModal(null)} className="p-1.5 bg-[var(--theme-bg)] rounded-full text-slate-500 transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-[var(--theme-bg)] transition-colors p-5 rounded-2xl border border-indigo-500/20 leading-relaxed transition-colors">
                        <p className="text-sm text-[var(--theme-text)] font-bold transition-colors">시장 전체 업종의 AI 점수를 산술 평균하여 산출한 <span className="text-[var(--theme-point)] font-black transition-colors">통합 시장 심리 지수</span>입니다.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                            <span className="text-[11px] font-black text-rose-600 block mb-1">탐욕 (Greed)</span>
                            <p className="text-[10px] text-slate-500 font-bold transition-colors">평균 65% 이상. 상승세가 강력하며 전방위적 수급 유입 발생.</p>
                        </div>
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                            <span className="text-[11px] font-black text-indigo-600 block mb-1">중립 (Neutral)</span>
                            <p className="text-[10px] text-slate-500 font-bold transition-colors">40% ~ 60% 사이. 매수와 매도의 팽팽한 균형 및 방향성 탐색 구간.</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                            <span className="text-[11px] font-black text-blue-600 block mb-1">공포 (Fear)</span>
                            <p className="text-[10px] text-slate-500 font-bold transition-colors">평균 35% 이하. 하락 압력이 우세하며 보수적 접근 필요.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderRotationHelp = () => (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setHelpModal(null)}></div>
            <div className="relative w-full max-w-md bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-[32px] shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><Target className="text-yellow-600" size={20} /> 순환매 예측 가이드</h3>
                    <button onClick={() => setHelpModal(null)} className="p-1.5 bg-[var(--theme-bg)] rounded-full text-slate-500 transition-colors"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-[var(--theme-bg)] transition-colors p-5 rounded-2xl border border-yellow-500/20 leading-relaxed transition-colors">
                        <p className="text-xs text-slate-500 font-black mb-3 transition-colors">[산출 로직]</p>
                        <p className="text-sm text-[var(--theme-text)] font-bold mb-2 transition-colors">기본 50점 + (업종 평균 등락률 × 5) + (거래대금 가중치, 최대 25점)</p>
                        <p className="text-[11px] text-slate-500 italic font-medium transition-colors">"가격 상승과 돈의 흐름(거래대금)이 동시에 터지는 섹터를 실시간 포착합니다."</p>
                    </div>
                    <div className="bg-[var(--theme-header)] transition-colors p-4 rounded-2xl border border-[var(--theme-border)] transition-colors">
                        <p className="text-[11px] text-slate-500 font-bold leading-relaxed transition-colors">점수가 <span className="text-yellow-600 font-black">55점 이상</span>인 업종을 순환매 주도 섹터로 분류하며, 상위 5개 업종을 리스트에 노출합니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAiTracker = () => (
        <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-2xl p-4 shadow-xl flex flex-col gap-3 h-full min-h-[300px]">
            <div className="flex justify-between items-center shrink-0 transition-colors">
                <div className="flex items-center gap-2 transition-colors">
                    <h2 className="text-xs lg:text-sm font-black text-[var(--theme-text)] flex items-center gap-2 uppercase tracking-tighter transition-colors"><Sparkles size={16} className="text-[var(--theme-point)] animate-pulse" /> 실시간 AI 수급 포착</h2>
                    <button onClick={() => setHelpModal('supply')} className="text-slate-500 hover:text-[var(--theme-point)] transition-colors"><HelpCircle size={14} /></button>
                </div>
                <span className="text-[8px] font-black text-[var(--theme-point)] bg-[var(--theme-point)]/10 px-2 py-0.5 rounded-full border border-[var(--theme-point)]/20 transition-colors">LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar-thin space-y-2 pr-1 transition-colors">
                {data.aiSignals && data.aiSignals.length > 0 ? (
                    data.aiSignals.map((sig, i) => {
                        const colors = getScoreColor(sig.prediction_score);
                        return (
                            <div key={i} className={classNames("bg-[var(--theme-bg)] transition-colors border rounded-xl p-3 flex items-center justify-between group hover:border-[var(--theme-point)]/50 transition-all shadow-sm animate-in slide-in-from-right-4 duration-300", colors.border)}>
                                <div className="flex flex-col gap-0.5 transition-colors">
                                    <span className="text-[12px] font-black text-[var(--theme-text)] group-hover:text-[var(--theme-point)] transition-colors">{sig.stock_name}</span>
                                    <div className="flex items-center gap-1.5 transition-colors">
                                        <span className={classNames("text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase transition-colors", colors.text, colors.lightBg, colors.border)}>{sig.signal_type.replace(/_/g, ' ')}</span>
                                        <span className="text-[9px] text-slate-500 font-mono font-bold italic transition-colors">{new Date(sig.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end transition-colors">
                                    <span className={classNames("text-sm font-black transition-colors", colors.text)}>{sig.prediction_score}%</span>
                                    <div className="w-14 h-1.5 bg-slate-200/50 rounded-full mt-1 overflow-hidden transition-colors">
                                        <div className={classNames("h-full transition-all duration-1000", colors.bg)} style={{ width: `${sig.prediction_score}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-8 opacity-50 transition-colors"><Activity size={24} className="animate-pulse" /><p className="text-[10px] font-black uppercase transition-colors">수급 분석 중...</p></div>
                )}
            </div>
        </div>
    );

    const renderAiStrategy = () => {
        const heatmap = data.heatmap || [];
        let avgScore = 50;
        if (heatmap.length > 0) {
            const validScores = heatmap.map(item => parseFloat(item.ai_score || 50)).filter(s => !isNaN(s));
            if (validScores.length > 0) avgScore = validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length;
        }
        const rotationList = [...heatmap].filter(item => (parseFloat(item.ai_score) || 50) > 55).sort((a, b) => (parseFloat(b.ai_score) || 0) - (parseFloat(a.ai_score) || 0)).slice(0, 5);
        const sentiment = avgScore >= 65 ? "상승 우위(Greed)" : (avgScore <= 35 ? "하락 우위(Fear)" : "중립(Neutral)");
        const sentimentColor = avgScore >= 65 ? "text-rose-600" : (avgScore <= 35 ? "text-blue-600" : "text-indigo-600");

        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto custom-scrollbar p-1 pb-10 transition-colors">
                <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-3xl p-6 shadow-xl flex items-center justify-between">
                    <div className="flex items-center gap-4 transition-colors">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 transition-colors"><Activity className="text-emerald-600" size={24} /></div>
                        <div className="transition-colors">
                            <h2 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-widest flex items-center gap-2 transition-colors">
                                AI Prediction Hit Rate
                                <button onClick={() => setHelpModal('hitrate')} className="text-slate-500 hover:text-emerald-600 transition-colors"><HelpCircle size={12} /></button>
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold transition-colors">(최근 7일 예측 성적)</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end transition-colors">
                        <span className="text-2xl font-black text-emerald-600 font-mono transition-colors">{data.hitRate || 0}%</span>
                        <div className="w-24 h-1.5 bg-slate-200/50 rounded-full mt-1 overflow-hidden transition-colors"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${data.hitRate || 0}%` }}></div></div>
                    </div>
                </div>

                <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-3xl p-8 flex flex-col items-center shadow-xl relative overflow-hidden shrink-0 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500 opacity-50"></div>
                    <div className="flex items-center gap-2 mb-8 transition-colors">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2 transition-colors">
                            <Brain size={14} className="text-indigo-600" /> Market Intelligence Gauge
                            <button onClick={() => setHelpModal('gauge')} className="text-slate-500 hover:text-indigo-600 transition-colors"><HelpCircle size={12} /></button>
                        </h2>
                    </div>
                    <div className="relative w-64 h-32 overflow-hidden transition-colors">
                        <div className="absolute inset-0 border-[20px] border-[var(--theme-border)] rounded-t-full transition-colors duration-500 shadow-inner"></div>
                        <div className={classNames("absolute inset-0 border-[20px] rounded-t-full transition-all duration-[1500ms] origin-bottom ease-out shadow-sm", avgScore >= 60 ? "border-rose-500" : (avgScore <= 40 ? "border-blue-500" : "border-indigo-500"))} style={{ transform: `rotate(${(avgScore / 100) * 180 - 180}deg)` }}></div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center transition-colors"><span className={classNames("text-5xl font-black tracking-tighter transition-colors", sentimentColor)}>{Math.round(avgScore)}<span className="text-xl ml-0.5">%</span></span></div>
                    </div>
                    <p className={classNames("mt-8 text-[11px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] transition-colors shadow-sm", sentimentColor)}>{sentiment}</p>
                </div>

                <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-3xl p-6 shadow-xl flex flex-col gap-4 transition-colors">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border)] transition-colors">
                        <div className="flex items-center gap-2 transition-colors">
                            <h2 className="text-sm font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors">
                                <Target size={18} className="text-yellow-600" /> 순환매 예측
                                <button onClick={() => setHelpModal('rotation')} className="text-slate-600 hover:text-yellow-600 transition-colors"><HelpCircle size={12} /></button>
                            </h2>
                        </div>
                        <span className="text-[10px] text-slate-500 font-black font-mono transition-colors uppercase tracking-widest">LSTM Engine</span>
                    </div>
                    <div className="space-y-3 transition-colors">
                        {rotationList.length > 0 ? rotationList.map((sect, i) => (
                            <div key={i} className="bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:border-[var(--theme-point)]/50 rounded-2xl p-4 flex items-center justify-between group transition-all shadow-sm transition-colors">
                                <div className="flex items-center gap-4 transition-colors"><span className="text-xl lg:text-2xl font-black text-slate-400/40 italic group-hover:text-[var(--theme-point)] transition-colors tracking-tighter">#{i+1}</span><div><div className="text-sm font-black text-[var(--theme-text)] mb-0.5 transition-colors">{sect.industry_name}</div><div className="flex items-center gap-2 transition-colors"><span className="text-[10px] text-slate-500 font-bold transition-colors">현재 등락</span><span className={classNames("text-[10px] font-black transition-colors", parseFloat(sect.change_rate) > 0 ? "text-rose-600" : "text-blue-600")}>{sect.change_rate}%</span></div></div></div>
                                <div className="text-right transition-colors">
                                    <div className="text-[10px] text-slate-500 font-black uppercase mb-1 transition-colors">AI Score</div>
                                    <div className="flex items-center gap-2 transition-colors">
                                        <div className="w-16 h-2 bg-slate-200/50 rounded-full overflow-hidden transition-colors shadow-inner">
                                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-sm" style={{ width: `${sect.ai_score || 50}%` }}></div>
                                        </div>
                                        <div className="flex flex-col items-end transition-colors">
                                            <div className="flex items-center gap-1.5 transition-colors">
                                                <span className="text-sm font-black text-indigo-600 transition-colors">
                                                    {parseFloat(sect.ai_score || 50).toFixed(1)}
                                                </span>
                                                {parseFloat(sect.score_diff) !== 0 && (
                                                    <span className={classNames("text-[10px] font-black transition-colors", parseFloat(sect.score_diff) > 0 ? "text-rose-600" : "text-blue-600")}>
                                                        {parseFloat(sect.score_diff) > 0 ? '▲' : '▼'}{Math.abs(parseFloat(sect.score_diff)).toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-black mt-[-1px] transition-colors">
                                                D-1: {(parseFloat(sect.ai_score || 50) - parseFloat(sect.score_diff || 0)).toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : <div className="text-center py-12 text-slate-500 text-xs font-black transition-colors">뚜렷한 상승 주도 업종이 포착되지 않았습니다.</div>}
                    </div>
                </div>
            </div>
        );
    };

    // [v16.54] 시장 전환점 나침반 (Market Turning Point / Compass) 뷰
    const renderCompass = () => {
        if (!compassData) {
            return (
                <div className="h-full flex flex-col items-center justify-center gap-4 py-32">
                    <Loader2 size={48} className="animate-spin text-cyan-500 opacity-50" />
                    <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] animate-pulse">Calculating Market Compass...</p>
                </div>
            );
        }

        const score = compassData.fearGreedScore || 50;
        const metrics = compassData.metrics || {};
        const investorFlow = compassData.investorFlow || [];
        const phase = compassData.phase || '중립';
        const advice = compassData.actionAdvice || '';
        const signal = compassData.signalStatus || 'NEUTRAL';

        // 게이지 색상 및 회전 각도 (-90도 ~ +90도)
        const rotationDeg = (score / 100) * 180 - 180;
        const gaugeColor = score <= 30 ? 'text-emerald-400' : (score <= 45 ? 'text-blue-400' : (score <= 60 ? 'text-indigo-400' : (score <= 75 ? 'text-amber-400' : 'text-rose-500')));
        const gaugeBorder = score <= 30 ? 'border-emerald-500' : (score <= 45 ? 'border-blue-500' : (score <= 60 ? 'border-indigo-500' : (score <= 75 ? 'border-amber-500' : 'border-rose-500')));

        return (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full overflow-y-auto custom-scrollbar p-1 pb-16">
                {/* 상단 핵심 알림 배너 */}
                <div className="bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-transparent border border-cyan-500/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
                            <Compass className="text-cyan-400 animate-spin-slow" size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                                    Market Turning Point Radar
                                </span>
                                <span className={classNames(
                                    "text-[9px] font-black px-2 py-0.5 rounded-full border",
                                    signal === 'BOTTOM_BUY' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse" :
                                    signal === 'PEAK_WARN' ? "bg-rose-500/20 text-rose-400 border-rose-500/30 animate-pulse" :
                                    "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                                )}>
                                    {signal === 'BOTTOM_BUY' ? '🚨 바닥 매수 유효' : (signal === 'PEAK_WARN' ? '⚠️ 상투 과열 경보' : '⚖️ 중립 국면')}
                                </span>
                            </div>
                            <h2 className="text-lg lg:text-xl font-black text-[var(--theme-text)]">
                                {phase}
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed max-w-2xl">
                                {advice}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-4 border-l border-white/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fear & Greed Index</span>
                        <div className={classNames("text-4xl lg:text-5xl font-black font-mono tracking-tight", gaugeColor)}>
                            {score}<span className="text-xl">/100</span>
                        </div>
                    </div>
                </div>

                {/* 중앙 3단 핵심 지표 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. 복합 공포/탐욕 반원 나침반 게이지 */}
                    <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between">
                        <div className="flex items-center gap-2 mb-4 w-full justify-between">
                            <span className="text-xs font-black text-[var(--theme-text)] flex items-center gap-1.5 uppercase tracking-wider">
                                <Gauge size={16} className="text-cyan-400" /> 공포 / 탐욕 게이지
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">실시간 가중 산출</span>
                        </div>
                        
                        <div className="relative w-56 h-28 overflow-hidden my-4">
                            <div className="absolute inset-0 border-[18px] border-[var(--theme-border)] rounded-t-full"></div>
                            <div 
                                className={classNames("absolute inset-0 border-[18px] rounded-t-full transition-all duration-[1500ms] origin-bottom ease-out shadow-sm", gaugeBorder)} 
                                style={{ transform: `rotate(${rotationDeg}deg)` }}
                            ></div>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                                <span className={classNames("text-3xl font-black tracking-tight", gaugeColor)}>
                                    {score}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between w-full text-[10px] font-black px-2 pt-2 border-t border-[var(--theme-border)] text-slate-500">
                            <span className="text-emerald-400">0 극단적 공포(바닥)</span>
                            <span className="text-indigo-400">50 중립</span>
                            <span className="text-rose-400">100 극단적 탐욕(과열)</span>
                        </div>
                    </div>

                    {/* 2. 장중 시장 폭 (Market Breadth) & 과매도/과매수 */}
                    <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black text-[var(--theme-text)] flex items-center gap-1.5 uppercase tracking-wider">
                                <Activity size={16} className="text-indigo-400" /> 시장 과열/침체 지표
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono font-bold">1,500+ 종목</span>
                        </div>

                        <div className="space-y-3.5">
                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="text-slate-400">RSI 과매도 종목 (침체 바닥):</span>
                                    <span className="text-emerald-400 font-black">{metrics.rsi_oversold_cnt || 0} 종목</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, ((metrics.rsi_oversold_cnt || 0) / 300) * 100)}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="text-slate-400">RSI 과매수 종목 (과열 경보):</span>
                                    <span className="text-rose-400 font-black">{metrics.rsi_overbought_cnt || 0} 종목</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, ((metrics.rsi_overbought_cnt || 0) / 100) * 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-[var(--theme-border)] flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold">전체 시장 평균 RSI:</span>
                                <span className="text-indigo-300 font-black">{metrics.avg_rsi || 50}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3. 업종 등락 비율 및 골든크로스 현황 */}
                    <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black text-[var(--theme-text)] flex items-center gap-1.5 uppercase tracking-wider">
                                <ShieldCheck size={16} className="text-yellow-500" /> 수급 및 기술적 모멘텀
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono font-bold">골든크로스</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 my-auto">
                            <div className="bg-[var(--theme-bg)] p-3 rounded-2xl border border-[var(--theme-border)] text-center">
                                <span className="text-[10px] text-slate-500 font-bold block mb-1">상승 vs 하락 업종</span>
                                <div className="text-sm font-black">
                                    <span className="text-rose-400">{metrics.rising_industries || 0}</span>
                                    <span className="text-slate-500 mx-1">/</span>
                                    <span className="text-blue-400">{metrics.falling_industries || 0}</span>
                                </div>
                            </div>
                            <div className="bg-[var(--theme-bg)] p-3 rounded-2xl border border-[var(--theme-border)] text-center">
                                <span className="text-[10px] text-slate-500 font-bold block mb-1">골든크로스 종목</span>
                                <span className="text-sm font-black text-amber-400">
                                    {metrics.golden_cross_cnt || 0} 종목
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-[var(--theme-border)] text-[11px] text-slate-400 font-medium">
                            전체 업종 평균 등락률: <strong className={parseFloat(metrics.avg_industry_rate || 0) >= 0 ? "text-rose-400" : "text-blue-400"}>
                                {parseFloat(metrics.avg_industry_rate || 0) >= 0 ? '+' : ''}{metrics.avg_industry_rate || 0}%
                            </strong>
                        </div>
                    </div>
                </div>

                {/* 하단: 최근 7거래일 큰손(외인/기관/개인) 시장 수급 동향 테이블 */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Navigation size={18} className="text-cyan-400" />
                            <h3 className="text-sm lg:text-base font-black text-[var(--theme-text)]">
                                최근 시장 주체별 순매수 추이 (일별 자금 흐름)
                            </h3>
                        </div>
                        <span className="text-[10px] text-slate-500 font-bold">단위: 주</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-[var(--theme-border)] text-slate-500 font-black text-[11px]">
                                    <th className="py-2.5 px-3">일자</th>
                                    <th className="py-2.5 px-3 text-right">외국인 순매수</th>
                                    <th className="py-2.5 px-3 text-right">기관 순매수</th>
                                    <th className="py-2.5 px-3 text-right">개인 순매수</th>
                                    <th className="py-2.5 px-3 text-center">주요 수급 주체</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--theme-border)]/50">
                                {investorFlow.length > 0 ? investorFlow.map((row, idx) => {
                                    const foreign = row.foreign_net_buy || 0;
                                    const inst = row.inst_net_buy || 0;
                                    const indiv = row.indiv_net_buy || 0;
                                    const mainActor = foreign > 0 && inst > 0 ? '외인/기관 양매수' : (foreign > 0 ? '외국인 순매수' : (inst > 0 ? '기관 순매수' : '개인 순매수'));

                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors font-mono">
                                            <td className="py-2.5 px-3 font-bold text-slate-300">{row.date}</td>
                                            <td className={classNames("py-2.5 px-3 text-right font-bold", foreign >= 0 ? "text-rose-400" : "text-blue-400")}>
                                                {foreign > 0 ? `+${foreign.toLocaleString()}` : foreign.toLocaleString()}
                                            </td>
                                            <td className={classNames("py-2.5 px-3 text-right font-bold", inst >= 0 ? "text-rose-400" : "text-blue-400")}>
                                                {inst > 0 ? `+${inst.toLocaleString()}` : inst.toLocaleString()}
                                            </td>
                                            <td className={classNames("py-2.5 px-3 text-right font-bold", indiv >= 0 ? "text-rose-400" : "text-blue-400")}>
                                                {indiv > 0 ? `+${indiv.toLocaleString()}` : indiv.toLocaleString()}
                                            </td>
                                            <td className="py-2.5 px-3 text-center font-sans">
                                                <span className={classNames(
                                                    "text-[10px] font-black px-2 py-0.5 rounded-full border",
                                                    mainActor.includes('양매수') ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-slate-800 text-slate-300 border-slate-700"
                                                )}>
                                                    {mainActor}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-slate-500">수급 데이터를 집계 중입니다.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderMonitor = () => (
        <>
            <div className={classNames("flex flex-col gap-4 shrink-0 transition-colors", mobileTab !== 'overview' && 'hidden lg:flex')}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 transition-colors">
                    {[
                        { label: '상승 업종 비율 (ADR)', val: `${data.breadth?.rising_count || 0} SEC`, sub: `${((data.breadth?.rising_count / (data.breadth?.rising_count + data.breadth?.falling_count || 1)) * 100).toFixed(0)}%`, color: 'rose' },
                        { label: '하락 비중', val: `${data.breadth?.falling_count || 0} SEC`, sub: `${((data.breadth?.falling_count / (data.heatmap?.length || 1)) * 100).toFixed(0)}%`, color: 'blue' },
                        { label: '시장 강도', val: `${((data.breadth?.rising_count / (data.breadth?.falling_count || 1)) * 100).toFixed(1)}%`, sub: '', color: 'indigo', icon: true },
                        { label: 'Top Sector', val: data.heatmap && data.heatmap.length > 0 ? data.heatmap[0].industry_name : 'Wait...', sub: data.heatmap && data.heatmap.length > 0 ? `${parseFloat(data.heatmap[0].change_rate) > 0 ? '+' : ''}${data.heatmap[0].change_rate}%` : '', color: 'slate' }
                    ].map((item, i) => (
                        <div key={i} className="bg-[var(--theme-header)] border border-[var(--theme-border)] p-4 rounded-2xl shadow-lg flex flex-col justify-center h-20 lg:h-24 transition-colors">
                            <span className="text-[9px] font-black text-slate-500 uppercase mb-1.5 tracking-wider transition-colors">{item.label}</span>
                            <div className="flex items-baseline justify-between gap-2 overflow-hidden transition-colors">
                                <span className={classNames("text-lg lg:text-xl font-black truncate transition-colors", item.color === 'rose' ? 'text-rose-600' : item.color === 'blue' ? 'text-blue-600' : 'text-indigo-600')}>{item.val}</span>
                                {item.sub && <span className="text-[10px] font-black text-slate-500 transition-colors shrink-0">{item.sub}</span>}
                                {item.icon && <TrendingUp size={16} className="text-indigo-600 shrink-0" />}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="lg:hidden transition-colors">{renderAiTracker()}</div>
            </div>
            <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden transition-colors">
                <div className="hidden lg:flex lg:col-span-3 flex-col h-full overflow-hidden transition-colors">{renderAiTracker()}</div>
                <div id="industry-heatmap-area" className={classNames("col-span-12 lg:col-span-6 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl p-5 lg:p-8 shadow-xl flex flex-col h-full overflow-hidden transition-colors", mobileTab !== 'heatmap' && 'hidden lg:flex')}>
                    <div className="flex justify-between items-center mb-6 shrink-0 transition-colors"><h2 className="text-sm lg:text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><PieChart size={20} className="text-[var(--theme-point)]" /> 업종 등락 히트맵</h2><span className="text-[10px] font-black text-[var(--theme-point)] bg-[var(--theme-point)]/10 px-3 py-1 rounded-full border border-[var(--theme-point)]/20 transition-colors">Top 50 Sectors</span></div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-4 content-start transition-colors">
                        {data.heatmap?.map((item, idx) => (
                            <div key={idx} onClick={() => setSelectedSector(item)} className={classNames("relative aspect-[1.2/1] lg:aspect-[4/3] rounded-xl p-2 lg:p-4 flex flex-col justify-center items-center lg:justify-between lg:items-start transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border border-white/5 text-center lg:text-left shadow-sm transition-colors", getHeatmapColor(item.change_rate))}>
                                {item.ai_signal === 'BUY' && <div className="absolute top-1.5 right-1.5 flex items-center justify-center bg-rose-500 rounded-full p-0.5 shadow-lg transition-colors"><ArrowUpCircle className="text-white animate-pulse" size={14} /></div>}
                                {item.ai_signal === 'SELL' && <div className="absolute top-1.5 right-1.5 flex items-center justify-center bg-blue-500 rounded-full p-0.5 shadow-lg transition-colors"><ArrowDownCircle className="text-white" size={14} /></div>}
                                <span className="text-[10px] lg:text-[12px] font-black text-white leading-tight drop-shadow-md truncate w-full px-1 transition-colors">{item.industry_name}</span>
                                <div className="mt-1 lg:mt-0 lg:text-right w-full transition-colors"><span className="text-[11px] lg:text-base font-black text-white drop-shadow-md transition-colors">{parseFloat(item.change_rate) > 0 ? '+' : ''}{item.change_rate}%</span></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className={classNames("col-span-12 lg:col-span-3 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl p-5 lg:p-8 shadow-xl flex flex-col h-full overflow-hidden transition-colors", mobileTab !== 'themes' && 'hidden lg:flex')}>
                    <div className="flex justify-between items-center mb-6 shrink-0 transition-colors"><h2 className="text-sm lg:text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><Zap size={20} className="text-yellow-600" /> Hot Themes</h2>
                        <div className="flex items-center gap-2 transition-colors"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] text-slate-500 disabled:opacity-30 transition-colors shadow-sm"><ChevronLeft size={16} /></button><span className="text-[10px] font-black text-slate-500 font-mono transition-colors">{currentPage}/{totalPages || 1}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] text-slate-500 disabled:opacity-30 transition-colors shadow-sm"><ChevronRight size={16} /></button></div>
                    </div>
                    <div className="space-y-3 lg:space-y-4 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-4 transition-colors">
                        {paginatedThemes?.map((theme, idx) => (
                            <div key={idx} className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-4 flex flex-col gap-2 hover:border-[var(--theme-point)]/50 transition-all shadow-sm group transition-colors">
                                <div className="flex justify-between items-start transition-colors"><div className="flex items-center gap-2 flex-1 min-w-0 mr-2 transition-colors"><span className="text-[12px] lg:text-sm font-black text-[var(--theme-text)] group-hover:text-[var(--theme-point)] transition-colors truncate">{theme.theme_name}</span><span className={classNames("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border transition-colors", parseFloat(theme.total_score) >= 10 ? "text-rose-600 border-rose-500/20 bg-rose-500/10" : "text-slate-500 border-slate-300 bg-slate-100")}>{parseFloat(theme.total_score) >= 10 ? 'Hot' : 'Normal'}</span></div><span className="text-sm font-black text-[var(--theme-text)] transition-colors">{parseFloat(theme.total_score || 0).toFixed(1)}</span></div>
                                <div className="bg-[var(--theme-header)] rounded-xl border border-[var(--theme-border)] w-full p-3 flex items-start gap-2.5 transition-colors shadow-inner"><Target size={12} className="text-cyan-600 shrink-0 mt-0.5 transition-colors" /><span className="text-[10px] lg:text-[11px] font-black text-slate-500 break-all leading-relaxed transition-colors">{theme.lead_stocks || '-'}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex-1 bg-[var(--theme-bg)] p-3 lg:p-8 overflow-y-auto custom-scrollbar h-full flex flex-col gap-4 lg:gap-8 relative pb-24 lg:pb-8 transition-colors duration-500 font-sans">
            <header className="flex justify-between items-end shrink-0 px-1 transition-colors">
                <div className="transition-colors"><div className="flex items-center gap-3 mb-1.5 transition-colors"><div className="p-2 bg-[var(--theme-point)]/10 rounded-xl border border-[var(--theme-point)]/20 transition-colors"><LayoutDashboard className="text-[var(--theme-point)]" size={24} /></div><h1 className="text-xl lg:text-3xl font-black text-[var(--theme-text)] tracking-tighter uppercase italic transition-colors">Intelligence</h1></div><p className="text-slate-500 text-[10px] lg:text-sm font-black uppercase tracking-[0.3em] opacity-80 transition-colors">v1 Strategic Engine</p></div>
                <div className="hidden lg:flex bg-[var(--theme-header)] border border-[var(--theme-border)] p-1.5 rounded-2xl shadow-xl transition-colors">
                    <button onClick={() => setActiveTab('monitor')} className={classNames("px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2.5 transition-colors", activeTab === 'monitor' ? "bg-[var(--theme-point)] text-white shadow-lg" : "text-slate-500 hover:text-[var(--theme-text)]")}><Activity size={14}/> MONITOR</button>
                    <button onClick={() => setActiveTab('strategy')} className={classNames("px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2.5 transition-colors", activeTab === 'strategy' ? "bg-rose-600 text-white shadow-lg" : "text-slate-500 hover:text-[var(--theme-text)]")}><Brain size={14}/> AI STRATEGY</button>
                    <button onClick={() => setActiveTab('compass')} className={classNames("px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2.5 transition-colors", activeTab === 'compass' ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30" : "text-slate-500 hover:text-[var(--theme-text)]")}><Compass size={14}/> MARKET COMPASS</button>
                </div>
            </header>
            
            {(activeTab === 'monitor' && mobileTab !== 'ai_strategy' && mobileTab !== 'compass') ? renderMonitor() : null}
            {((activeTab === 'strategy' && window.innerWidth >= 1024) || mobileTab === 'ai_strategy') ? renderAiStrategy() : null}
            {((activeTab === 'compass' && window.innerWidth >= 1024) || mobileTab === 'compass') ? renderCompass() : null}
            
            <div className="fixed bottom-0 left-0 right-0 bg-[var(--theme-header)] border-t border-[var(--theme-border)] flex justify-around items-center h-18 lg:hidden z-50 pb-safe transition-colors shadow-2xl">
                <button onClick={() => setMobileTab('overview')} className={classNames("flex flex-col items-center gap-1.5 p-3 w-full transition-all active:scale-95 transition-colors", mobileTab === 'overview' ? "text-[var(--theme-point)]" : "text-slate-500")}><Activity size={22} /><span className="text-[10px] font-black transition-colors">대시보드</span></button>
                <button onClick={() => setMobileTab('heatmap')} className={classNames("flex flex-col items-center gap-1.5 p-3 w-full transition-all active:scale-95 transition-colors", mobileTab === 'heatmap' ? "text-[var(--theme-point)]" : "text-slate-500")}><PieChart size={22} /><span className="text-[10px] font-black transition-colors">히트맵</span></button>
                <button onClick={() => setMobileTab('ai_strategy')} className={classNames("flex flex-col items-center gap-1.5 p-3 w-full transition-all active:scale-95 transition-colors", mobileTab === 'ai_strategy' ? "text-rose-500" : "text-slate-500")}><Brain size={22} /><span className="text-[10px] font-black transition-colors">AI 전략</span></button>
                <button onClick={() => setMobileTab('compass')} className={classNames("flex flex-col items-center gap-1.5 p-3 w-full transition-all active:scale-95 transition-colors", mobileTab === 'compass' ? "text-cyan-400" : "text-slate-500")}><Compass size={22} /><span className="text-[10px] font-black transition-colors">나침반</span></button>
            </div>

            {selectedSector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSector(null)}></div>
                    <div className="relative w-full max-w-sm bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
                        <div className="p-6 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/50 flex justify-between items-center transition-colors"><div className="flex-1 mr-3 transition-colors"><h3 className="text-xl font-black text-[var(--theme-text)] leading-tight break-keep transition-colors">{selectedSector.industry_name}</h3><span className={classNames("text-sm font-black transition-colors", parseFloat(selectedSector.change_rate) > 0 ? "text-rose-600" : "text-blue-600")}>{parseFloat(selectedSector.change_rate) > 0 ? '+' : ''}{selectedSector.change_rate}%</span></div><button onClick={() => setSelectedSector(null)} className="p-2 bg-[var(--theme-bg)] rounded-full hover:bg-slate-200 text-slate-500 transition-colors shrink-0 transition-colors"><X size={24} /></button></div>
                        <div className="p-8 transition-colors">
                            <h4 className="text-[11px] font-black text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest transition-colors">
                                <Target size={16} className="text-cyan-600" /> Leading Stocks
                            </h4>
                            <div className="flex flex-wrap gap-2.5 transition-colors">
                                {selectedSector.lead_stocks ? (
                                    selectedSector.lead_stocks.split(',').map((stock, i) => (
                                        <button 
                                            key={i} 
                                            type="button"
                                            onClick={(e) => handleStockClick(e, stock)}
                                            disabled={isSearchingCode}
                                            className="px-4 py-2 bg-[var(--theme-bg)] text-[var(--theme-text)] text-xs font-black rounded-xl border border-[var(--theme-border)] hover:border-[var(--theme-point)] hover:text-[var(--theme-point)] transition-all active:scale-95 cursor-pointer transition-colors flex items-center gap-2"
                                        >
                                            {stock.trim()}
                                            <TrendingUp size={12} className="opacity-40" />
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 font-bold italic transition-colors">데이터 분석 중...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* [v16.39.3] Intelligence Stock Chart Modal */}
            {selectedStock && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedStock(null)}></div>
                    <div className="relative w-full max-w-6xl h-[85vh] bg-[var(--theme-bg)] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="h-16 bg-[var(--theme-header)] border-b border-[var(--theme-border)] flex items-center justify-between px-8 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--theme-point)]/10 rounded-lg">
                                    <TrendingUp className="text-[var(--theme-point)]" size={20} />
                                </div>
                                <h3 className="text-lg font-black text-[var(--theme-text)] uppercase tracking-tighter">Stock Intelligence Chart</h3>
                            </div>
                            <button 
                                onClick={() => setSelectedStock(null)}
                                className="p-2.5 bg-[var(--theme-bg)] rounded-full text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        {/* Chart Area */}
                        <div className="flex-1 overflow-hidden">
                            <ChartWidget 
                                stock={selectedStock} 
                                currentPeriod="1D" 
                                marketMode="UN" 
                                onPeriodChange={() => {}} 
                                onExchangeChange={() => {}} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Searching Loader Overlay */}
            {isSearchingCode && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <div className="bg-white/90 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3">
                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Finding Asset...</p>
                    </div>
                </div>
            )}

            {helpModal === 'supply' && renderSupplyHelp()}
            {helpModal === 'hitrate' && renderHitRateHelp()}
            {helpModal === 'gauge' && renderGaugeHelp()}
            {helpModal === 'rotation' && renderRotationHelp()}
        </div>
    );
};

export default AdminIntelligenceDashboard;
