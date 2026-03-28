import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, Download, Calendar, TrendingUp, ChevronRight, Brain, Image as ImageIcon, Map, Activity, Clock, FileText, CheckCircle2, Lock, AlertTriangle, Loader2, ListOrdered, Award, X, Maximize2, Sparkles } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';
import html2canvas from 'html2canvas-pro'; 
import jsPDF from 'jspdf';

import { useNavigate } from 'react-router-dom';

const AdminTheDailyMagazine = () => {
    const navigate = useNavigate();

    // [v36.61] Zero-Trust UI Security: ADMIN 권한 확인 및 미승인 시 즉시 퇴출
    useEffect(() => {
        const userRole = localStorage.getItem('role');
        if (userRole !== 'ADMIN') {
            console.error(">>> [SECURITY ALERT] Unauthorized access attempt to Daily Magazine.");
            alert("관리자 전용 영역입니다. 접근 권한이 없습니다.");
            navigate('/');
        }
    }, [navigate]);

    const [isLoading, setIsLoading] = useState(false);
    const [isDownloadable, setIsDownloadable] = useState(false);
    const [magazineData, setMagazineData] = useState({
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
        headline: "데이터가 가리키는 오늘의 주도주 맥점",
        marketBrief: "데이터 분석 중...",
        stockComments: ["-", "-", "-"],
        topLeaders: [],
        indices: { kospi: '-', kospiRate: '-', kosdaq: '-', kosdaqRate: '-' },
        // [v15.0] 프리미엄 인텔리전스 데이터 필드 추가
        sentiment: { score: 50, label: 'Neutral' },
        keywords: ["#주도주순환", "#수급집중", "#저점통과", "#세력매집", "#외인귀환"],
        macro: [
            { name: 'S&P 500', val: '-', change: '-' },
            { name: 'Nasdaq', val: '-', change: '-' },
            { name: 'USD/KRW', val: '-', change: '-' }
        ]
    });
    
    const [smartMoneyStocks, setSmartMoneyStocks] = useState([]); // [v14.9] 스마트머니 데이터 상태 추가
    
    const [zoomImage, setZoomImage] = useState(null);
    const magazineRef = useRef();

    const checkTime = () => {
        setIsDownloadable(true);
    };

    const parseBriefing = (raw) => {
        const parts = { market: "", stocks: ["-", "-", "-"] };
        try {
            const marketMatch = raw.match(/\[MARKET_BRIEF\](.*?)(\[STOCK_1[^\]]*\]|\[STOCK_2[^\]]*\]|\[STOCK_3[^\]]*\]|$)/s);
            if (marketMatch) parts.market = marketMatch[1].trim();
            for (let i = 1; i <= 3; i++) {
                const stockMatch = raw.match(new RegExp(`\\[STOCK_${i}[^\\]]*\\](.*?)(?=\\[STOCK_${i+1}[^\\]]*\\]|$)`, "s"));
                if (stockMatch) parts.stocks[i-1] = stockMatch[1].trim();
            }
        } catch (e) {}
        return parts;
    };

    const fetchMagazineData = async () => {
        try {
            setIsLoading(true);
            
            // [v15.1] 데이터 패칭 전 해외 지수 강제 동기화 트리거 호출
            try {
                await fetch('/api/admin/magazine/trigger-index-sync', { method: 'POST', headers: getAuthHeader() });
            } catch (e) { console.error("Trigger Error:", e); }

            const [magRes, smartRes, intelRes] = await Promise.all([
                fetch('/api/admin/magazine/data', { headers: getAuthHeader() }),
                fetch('/api/admin/intelligence/smart-money', { headers: getAuthHeader() }),
                fetch('/api/admin/intelligence/dashboard', { headers: getAuthHeader() })
            ]);

            let newMagData = { ...magazineData };

            if (magRes.ok) {
                const data = await magRes.json();
                const parsed = parseBriefing(data.briefing);
                const kospi = data.indices?.find(idx => idx.index_name === 'KOSPI') || {};
                const kosdaq = data.indices?.find(idx => idx.index_name === 'KOSDAQ') || {};

                // [v15.0] AI 핵심 키워드 자동 추출 로직 (Intelligence Extraction)
                const extractKeywords = () => {
                    const sourceText = (parsed.market + data.leaders.map(l => l.reason).join(' ')).replace(/[^\uAC00-\uD7A3a-zA-Z\s]/g, ' ');
                    const words = sourceText.split(/\s+/).filter(w => w.length >= 2 && w.length <= 6);
                    const counts = {};
                    words.forEach(w => counts[w] = (counts[w] || 0) + 1);
                    
                    // 빈도수 높은 순 + 고정 핵심 키워드 조합
                    const dynamicKws = Object.entries(counts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(entry => `#${entry[0]}`);
                    
                    return dynamicKws.length > 0 ? dynamicKws : ["#주도주순환", "#수급집중", "#저점통과"];
                };

                newMagData = {
                    ...newMagData,
                    date: new Date(data.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                    headline: data.leaders.length > 0 ? `${data.leaders[0].stock_name} 등 바닥 탈출 주도주 포착` : "지능형 투자 브리핑",
                    marketBrief: parsed.market,
                    stockComments: parsed.stocks,
                    topLeaders: data.leaders,
                    keywords: extractKeywords(), // 자동 추출된 키워드 주입
                    indices: {
                        kospi: kospi.index_value?.toLocaleString() || '-',
                        kospiRate: (kospi.change_rate >= 0 ? '+' : '') + (kospi.change_rate || '0') + '%',
                        kosdaq: kosdaq.index_value?.toLocaleString() || '-',
                        kosdaqRate: (kosdaq.change_rate >= 0 ? '+' : '') + (kosdaq.change_rate || '0') + '%'
                    }
                };
            }

            if (intelRes.ok) {
                const intel = await intelRes.json();
                const heatmap = intel.heatmap || [];
                const indices = intel.indices || []; // [v15.1] 실시간 지수 데이터
                
                // [v15.0] 진짜 데이터 기반 심리 점수 산출 (업종 AI 점수 평균)
                if (heatmap.length > 0) {
                    const validScores = heatmap.map(item => parseFloat(item.ai_score || 50)).filter(s => !isNaN(s));
                    const avgScore = Math.round(validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length);
                    let label = 'Neutral';
                    if (avgScore >= 65) label = 'Greed';
                    if (avgScore >= 75) label = 'Extreme Greed';
                    if (avgScore <= 35) label = 'Fear';
                    if (avgScore <= 25) label = 'Extreme Fear';
                    newMagData.sentiment = { score: avgScore, label };

                    // [v15.0] 진짜 데이터 기반 테마 모멘텀 Top 3 추출
                    const topThemes = [...heatmap]
                        .sort((a, b) => (parseFloat(b.ai_score) || 0) - (parseFloat(a.ai_score) || 0))
                        .slice(0, 3)
                        .map(item => ({
                            name: item.industry_name,
                            score: Math.round(item.ai_score || 50),
                            color: parseFloat(item.change_rate) > 0 ? 'bg-rose-500' : 'bg-indigo-600'
                        }));
                    newMagData.topThemes = topThemes;
                }

                // [v15.1] 진짜 데이터 기반 글로벌 매크로 스냅샷 매핑 (타겟 고정)
                if (indices.length > 0) {
                    const macroTargets = ['S&P 500', 'Nasdaq', 'USD/KRW'];
                    const mappedMacro = macroTargets.map(name => {
                        const found = indices.find(idx => idx.index_name === name);
                        if (found) {
                            return {
                                name: found.index_name,
                                val: parseFloat(found.index_value).toLocaleString(),
                                change: (parseFloat(found.change_rate) >= 0 ? '+' : '') + found.change_rate + '%'
                            };
                        }
                        return null;
                    }).filter(m => m !== null);
                    
                    if (mappedMacro.length > 0) {
                        newMagData.macro = mappedMacro;
                    }
                }
            }

            setMagazineData(newMagData);

            if (smartRes.ok) {
                const smartData = await smartRes.json();
                setSmartMoneyStocks(smartData.sort((a, b) => b.max_score - a.max_score).slice(0, 4));
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchMagazineData();
        checkTime();
        const timer = setInterval(checkTime, 60000);
        return () => clearInterval(timer);
    }, []);

    const handleGeneratePdf = async () => {
        try {
            setIsLoading(true);
            const element = magazineRef.current;
            if (!element) return;

            // [v15.7] 1. 안정화 대기 (모든 UI가 완전히 정착할 시간 부여)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);

            await document.fonts.ready;
            const images = element.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete && img.naturalWidth > 0) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                    setTimeout(resolve, 5000); 
                });
            }));

            // [v15.7] 2. 애니메이션 박멸 및 고정밀 캡처
            const canvas = await html2canvas(element, {
                scale: 2.5, // 메모리 안정성을 위해 2.5배로 유지 (충분히 선명함)
                useCORS: true,
                allowTaint: false,
                backgroundColor: "#f8f5f0",
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1400,
                onclone: (clonedDoc) => {
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        /* 모든 애니메이션 및 트랜지션 중단 (캡처 오류 방지) */
                        * { 
                            transition: none !important; 
                            animation: none !important; 
                            -webkit-font-smoothing: antialiased; 
                            font-family: 'Inter', sans-serif !important; 
                        }
                        .text-white { color: #ffffff !important; opacity: 1 !important; visibility: visible !important; }
                        .text-slate-400 { color: #94a3b8 !important; opacity: 1 !important; }
                        .text-emerald-400 { color: #34d399 !important; opacity: 1 !important; }
                        .text-indigo-600 { color: #4f46e5 !important; }
                        .bg-\\[\\#0f172a\\] { background-color: #0f172a !important; }
                        /* 레이아웃 강제 교정 */
                        #magazine-capture-root { width: 1400px !important; padding: 80px !important; }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            window.scrollTo(0, originalScrollY);

            // [v15.7] 용량 및 품질 밸런스 조정
            const imgData = canvas.toDataURL('image/jpeg', 0.95); 
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            let pageCount = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = -(pageHeight * (++pageCount));
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pageHeight;
            }

            pdf.save(`StockPlus_Premium_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("PDF STABILITY ERROR:", e);
            alert("PDF 발행 중 시스템 부하가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderBriefingWithDropCap = (text) => {
        if (!text || text.length === 0) return null;
        const firstChar = text.charAt(0);
        const rest = text.slice(1);
        return (
            <p className="text-base lg:text-[19px] leading-relaxed font-sans font-medium break-keep text-slate-700 pb-2 tracking-tight">
                <span style={{ fontSize: '4.5rem', fontWeight: '900', color: '#4f46e5', float: 'left', lineHeight: '0.8', marginRight: '1rem', marginTop: '0.6rem' }}>{firstChar}</span>
                {rest}
            </p>
        );
    };

    const renderDetailedScores = (stock) => (
        <div className="flex gap-1 mt-1 flex-wrap items-center">
            {[
                { label: 'Q', val: stock.algo_score, color: '#4f46e5' },
                { label: 'L', val: stock.lstm_score, color: '#8b5cf6' },
                { label: 'T', val: stock.tcn_score, color: '#06b6d4' },
                { label: 'X', val: stock.xgb_score, color: '#f43f5e' }
            ].map(item => (
                <div key={item.label} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">
                    <span className="text-[7px] lg:text-[9px] font-black" style={{ color: item.color }}>{item.label}</span>
                    <span className="text-[8px] lg:text-[10px] font-bold text-[#475569]">{Math.round(item.val)}</span>
                </div>
            ))}
            <div className="ml-1 border-l border-slate-200 pl-2">
                {/* [v18.9 Patch] 분석 태그 폰트 교체(Sans), 진하게(Black), 색상 대비 상향 */}
                {stock.reason?.split(',').map((tag, idx) => (
                    <span key={idx} className="analysis-tag px-1.5 py-0.5 bg-indigo-100/50 text-[8px] lg:text-[10px] font-black font-sans text-indigo-800 rounded border border-indigo-200 whitespace-nowrap ml-1 shadow-sm">
                        {tag.trim()}
                    </span>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex-1 bg-[var(--theme-bg)] transition-colors duration-500 h-full overflow-hidden flex flex-col relative font-sans text-[var(--theme-text)]">
            <div className="h-14 bg-[var(--theme-header)] border-b border-[var(--theme-border)] flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 transition-colors duration-500">
                <div className="flex items-center gap-2">
                    <div className={classNames(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        isDownloadable ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                    )}>
                        {isDownloadable ? <Activity size={12} className="animate-pulse" /> : <Lock size={12} />}
                        {isDownloadable ? "PREMIUM READY" : "REPORT WAITING"}
                    </div>
                </div>
                <button 
                    onClick={handleGeneratePdf} 
                    disabled={!isDownloadable || isLoading} 
                    className={classNames(
                        "px-6 py-2 rounded-xl font-black text-xs text-white flex items-center gap-2 transition-all shadow-lg",
                        !isDownloadable ? "bg-slate-700 cursor-not-allowed opacity-50" : "bg-[var(--theme-point)] active:scale-95 hover:opacity-90"
                    )}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={14} /> : (isDownloadable ? <Download size={14} /> : <Lock size={14} />)} 
                    {isDownloadable ? "📄 PDF REPORT 발행" : "발행 제한 해제됨"}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f5f0]">
                <div ref={magazineRef} id="magazine-capture-root" style={{backgroundColor: '#f8f5f0'}} className="max-w-4xl mx-auto p-10 lg:p-20 text-[#1e293b] overflow-hidden">
                    <header className="border-b-4 border-[#0f172a] pb-6 mb-10 flex flex-col items-center text-center gap-3">
                        <div className="flex items-center gap-3 font-sans font-black tracking-[0.3em] uppercase text-[9px] lg:text-xs" style={{color: '#4338ca'}}>
                            <Activity size={14} /> StockPlus AI Intelligence
                        </div>
                        <h1 className="text-4xl lg:text-8xl font-black tracking-[-0.05em] uppercase italic leading-none flex items-center justify-center" style={{color: '#0f172a'}}>
                            Daily<span style={{color: '#4f46e5', marginLeft: '-0.1em'}}>Magazine</span>
                        </h1>
                        <div className="w-full flex justify-between items-center border-t border-[#cbd5e1] mt-4 pt-4 font-sans text-[9px] lg:text-xs font-bold uppercase tracking-widest" style={{color: '#64748b'}}>
                            <span>Edition v18.0 Premium</span>
                            <span className="flex items-center gap-1.5"><Calendar size={12} /> {magazineData.date}</span>
                            <span className="hidden sm:inline">Investment Report</span>
                        </div>
                    </header>

                    {/* [v15.0] NEW SECTION: MARKET SENTIMENT & GLOBAL MACRO */}
                    <section className="mb-16 grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute top-4 left-6 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Activity size={14} className="text-indigo-500" /> Market Sentiment</div>
                            <div className="relative w-64 h-32 mt-6 overflow-hidden">
                                <div className="absolute inset-0 w-64 h-64 rounded-full border-[20px] border-slate-100"></div>
                                <div className="absolute inset-0 w-64 h-64 rounded-full border-[20px] border-transparent transition-all duration-1000" style={{ 
                                    borderLeftColor: '#f43f5e', borderTopColor: magazineData.sentiment.score > 50 ? '#10b981' : '#f43f5e', 
                                    transform: `rotate(${ (magazineData.sentiment.score / 100) * 180 - 45 }deg)` 
                                }}></div>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-2">
                                    <div className="text-3xl font-black text-[#0f172a]">{magazineData.sentiment.score}%</div>
                                    <div className="text-[10px] font-black uppercase tracking-tighter text-indigo-600">{magazineData.sentiment.label}</div>
                                </div>
                            </div>
                            <p className="mt-4 text-[11px] font-medium text-slate-500 text-center max-w-[280px]">현재 시장의 투자 심리는 <span className="font-black text-indigo-600">'{magazineData.sentiment.label}'</span> 단계입니다. 자금 흐름의 가속도를 체크하세요.</p>
                        </div>
                        <div className="bg-[#0f172a] rounded-3xl p-8 shadow-xl flex flex-col justify-between">
                            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">Global Snapshot</div>
                            <div className="space-y-6">
                                {magazineData.macro.map((m, i) => (
                                    <div key={i} className="flex justify-between items-end border-b border-slate-800 pb-3 last:border-0">
                                        <span className="text-xs font-black text-slate-400">{m.name}</span>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-white">{m.val}</div>
                                            <div className="text-[10px] font-bold text-emerald-500">{m.change}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mb-16">
                        <div className="border-b border-[#cbd5e1] pb-10 mb-12">
                            <h2 className="text-xl lg:text-4xl font-black leading-tight mb-8 break-keep underline underline-offset-8 pb-2" style={{color: '#0f172a', textDecorationColor: 'rgba(79, 70, 229, 0.3)'}}>
                                "{magazineData.headline}"
                            </h2>
                            
                            {/* [v15.0] AI INSIGHT KEYWORDS */}
                            <div className="flex flex-wrap gap-2 mb-8">
                                {magazineData.keywords.map((kw, i) => (
                                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full border border-indigo-100 shadow-sm uppercase tracking-wider">
                                        {kw}
                                    </span>
                                ))}
                            </div>

                            <div className="flex gap-6 lg:gap-10 items-start">
                                <div className="hidden sm:flex w-16 h-16 rounded-full items-center justify-center shrink-0 shadow-xl" style={{backgroundColor: '#4f46e5'}}><Brain className="text-white" size={32} /></div>
                                {renderBriefingWithDropCap(magazineData.marketBrief)}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-8">
                            <Award style={{color: '#4f46e5'}} size={24} />
                            <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tight" style={{color: '#0f172a'}}> 오늘의 TOP 3 정밀 분석</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-6 mb-12">
                            {magazineData.topLeaders.slice(0, 3).map((stock, i) => (
                                <div key={i} className="bg-white p-6 lg:p-8 rounded-r-2xl flex flex-col lg:flex-row justify-between gap-6 shadow-md" style={{borderLeft: '10px solid #4f46e5'}}>
                                    <div className="flex-1 min-w-0">
                                        {/* [v18.9 Patch] pt-2 및 overflow-visible 적용으로 상단 잘림 원천 봉쇄 */}
                                        <div className="rank-title-row flex items-center gap-3 mb-2 flex-wrap pt-2 overflow-visible">
                                            <span className="text-[#ffffff] text-[9px] font-black px-3 py-1 rounded-full uppercase flex items-center justify-center min-w-[80px] whitespace-nowrap shadow-sm" style={{backgroundColor: '#0f172a', height: '24px'}}>RANK #{i+1}</span>
                                            <h4 className="rank-stock-name font-black text-lg lg:text-2xl whitespace-nowrap overflow-visible leading-none flex items-center" style={{color: '#0f172a', height: '32px'}}>{stock.stock_name}</h4>
                                            <span style={{color: '#94a3b8'}} className="font-mono text-sm lg:text-base flex items-center h-[24px]">{stock.stock_code}</span>
                                        </div>
                                        <p className="text-xs lg:text-base leading-relaxed italic font-sans break-keep text-[#475569]">{magazineData.stockComments[i]}</p>
                                        <div className="mt-1">{renderDetailedScores(stock)}</div>
                                    </div>
                                    <div className="flex flex-col items-end justify-center shrink-0 lg:border-l lg:pl-10 border-[#f1f5f9]">
                                        <div className="text-[8px] lg:text-[10px] font-black uppercase mb-1" style={{color: '#94a3b8'}}>AI Score</div>
                                        <div className="text-3xl lg:text-5xl font-black font-sans" style={{color: '#4f46e5'}}>{stock.total_score.toFixed(1)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 lg:p-8 rounded-3xl text-white flex flex-col lg:flex-row justify-between items-center gap-6 shadow-xl" style={{backgroundColor: '#0f172a'}}>
                            <div className="flex items-center gap-4">
                                <Activity size={32} style={{color: '#10b981'}} />
                                <div><h4 className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em]" style={{color: '#10b981'}}>Market Index</h4><p className="text-[10px] font-sans" style={{color: '#94a3b8'}}>실시간 시장 요약</p></div>
                            </div>
                            <div className="flex gap-8 lg:gap-16 font-sans justify-end">
                                <div className="text-right">
                                    <div className="text-[8px] lg:text-[9px] font-black uppercase" style={{color: '#64748b'}}>KOSPI 200</div>
                                    <div className="text-lg lg:text-2xl font-black text-white">{magazineData.indices.kospi} <span style={{color: '#f43f5e'}} className="text-sm ml-1">{magazineData.indices.kospiRate}</span></div>
                                </div>
                                <div className="text-right border-l border-[#334155] pl-8 lg:pl-16">
                                    <div className="text-[8px] lg:text-[9px] font-black uppercase" style={{color: '#64748b'}}>KOSDAQ 150</div>
                                    <div className="text-lg lg:text-2xl font-black text-white">{magazineData.indices.kosdaq} <span style={{color: '#f43f5e'}} className="text-sm ml-1">{magazineData.indices.kosdaqRate}</span></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-24 pt-12 border-t-2 border-[#cbd5e1]">
                        <div className="flex items-center gap-4 mb-10">
                            <Map style={{color: '#4f46e5'}} size={32} />
                            <h3 className="text-xl lg:text-[32px] font-black uppercase tracking-tight italic" style={{color: '#0f172a'}}>Industry Mapping</h3>
                        </div>

                        {/* [v15.0] NEW SECTION: THEME ROTATION TRACKER */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 font-sans">
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-inner">
                                <h4 className="text-xs font-black text-[#4338ca] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <TrendingUp size={16} /> Theme Momentum Top 3
                                </h4>
                                <div className="space-y-6">
                                    {(magazineData.topThemes || []).map((theme, i) => (
                                        <div key={i} className="relative">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-black text-[#0f172a]">{theme.name}</span>
                                                <span className="text-xs font-bold text-slate-500">{theme.score}pts</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                                <div className={classNames("h-full rounded-full transition-all duration-1000 delay-300", theme.color)} style={{ width: `${theme.score}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                    {(magazineData.topThemes || []).length === 0 && <p className="text-xs text-slate-400 italic">데이터를 분석 중입니다...</p>}
                                </div>
                            </div>
                            <div className="flex flex-col justify-center p-6 bg-indigo-600 rounded-3xl text-white shadow-xl relative overflow-hidden">
                                <Activity className="absolute bottom-[-20px] right-[-20px] opacity-10" size={160} />
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Intelligence Verdict</h4>
                                <p className="text-sm lg:text-base leading-relaxed font-bold italic">
                                    {magazineData.topThemes && magazineData.topThemes.length > 0 ? (
                                        `"현재 자금은 ${magazineData.topThemes[0].name}, ${magazineData.topThemes[1].name} 섹터를 중심으로 가파르게 이동 중입니다. 특히 ${magazineData.topThemes[0].name}의 모멘텀이 ${magazineData.topThemes[0].score}pts로 가장 강력하게 포착되며, 시장은 전반적으로 '${magazineData.sentiment.label}' 국면에 진입해 있습니다."`
                                    ) : (
                                        `"데이터 분석 엔진이 실시간 자금 흐름을 추적하고 있습니다. 잠시 후 최신 인텔리전스 리포트가 업데이트됩니다."`
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-[#e2e8f0] p-1.5 shadow-sm mb-10 cursor-pointer group relative" onClick={() => setZoomImage('/api/snapshots/heatmap_latest.png')}>
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all flex items-center justify-center z-10">
                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={48} />
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9] mb-4 font-sans">
                                <span className="text-[9px] lg:text-[10px] font-black uppercase flex items-center gap-2" style={{color: '#4338ca'}}>Closing Map Snapshot</span>
                                <span className="text-[8px] lg:text-[9px] font-bold italic tracking-widest uppercase" style={{color: '#94a3b8'}}>23:00 Capture</span>
                            </div>
                            <div className="max-w-[95%] mx-auto bg-[#f8fafc] relative overflow-hidden flex flex-col items-center justify-center border border-[#f1f5f9]">
                                <img src="/api/snapshots/heatmap_latest.png" alt="Heatmap" className="w-full h-auto" crossOrigin="anonymous" />
                                <ImageIcon size={64} style={{color: '#e2e8f0'}} className="absolute z-0" />
                            </div>
                        </div>
                        <div className="p-6 lg:p-8 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm">
                            <h4 className="text-[9px] font-black uppercase tracking-widest mb-4" style={{color: '#4338ca'}}>Sector Verdict</h4>
                            <p className="text-base lg:text-lg leading-relaxed font-sans text-[#475569]">
                                전일 시장의 자금 흐름 분석 결과입니다. 붉은색 섹터의 주도권 유지 여부를 장 초반 수급 강도를 통해 반드시 확인하시기 바랍니다.
                            </p>
                        </div>
                    </section>

                    {/* [v14.9] NEW SECTION: SMART MONEY CAPTURED LIST (GOLD THEME) */}
                    <section className="mb-24 pt-12 border-t-2 border-[#cbd5e1]">
                        <div className="flex items-center gap-4 mb-10">
                            <Sparkles style={{color: '#d97706'}} size={32} />
                            <h3 className="text-xl lg:text-[32px] font-black uppercase tracking-tight italic" style={{color: '#0f172a'}}>Smart Money Captured</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 font-sans">
                            {smartMoneyStocks.map((stock, i) => (
                                <div key={i} className="bg-white border border-amber-200 rounded-2xl p-6 shadow-lg relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
                                    <div className="flex justify-between items-start relative z-10 mb-4">
                                        <div>
                                            <h4 className="text-lg lg:text-xl font-black text-[#0f172a] mb-1">{stock.stock_name}</h4>
                                            <span className="text-[10px] font-black font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{stock.stock_code}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Max S-Score</div>
                                            <div className="text-2xl font-black text-amber-600 tracking-tighter">{parseFloat(stock.max_score).toFixed(1)}%</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 relative z-10">
                                        {stock.reason?.split(',').slice(0, 2).map((r, idx) => (
                                            <span key={idx} className="text-[9px] font-black px-2 py-1 bg-slate-50 text-slate-500 rounded border border-slate-100 uppercase truncate max-w-[120px]">
                                                {r.trim()}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-amber-100 flex justify-between items-center relative z-10">
                                        <span className="text-[9px] font-bold text-amber-700/60 italic">Captured on {new Date(stock.last_detected).toLocaleDateString()}</span>
                                        <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">PREMIUM INSIGHT <ChevronRight size={10} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 rounded-3xl border border-amber-200 flex flex-col lg:flex-row items-center gap-6 shadow-xl shadow-amber-500/5" style={{backgroundColor: '#fffbeb'}}>
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                                <TrendingUp className="text-amber-600" size={28} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-1">Institutional Conviction</h4>
                                <p className="text-sm lg:text-base leading-relaxed font-medium text-amber-900/70">
                                    스마트 머니 포착 리스트는 거대 자본의 집중 매집이 확인된 종목군입니다. 해당 종목들은 시장의 변동성에도 불구하고 강력한 하방 경직성을 확보한 것으로 분석됩니다.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="pt-12 border-t-2 border-[#cbd5e1]">
                        <div className="flex items-center gap-4 mb-10">
                            <ListOrdered style={{color: '#4f46e5'}} size={32} />
                            <h3 className="text-xl lg:text-3xl font-black uppercase tracking-tight italic" style={{color: '#0f172a'}}>Next Leaders Ranking <span style={{color: '#94a3b8'}} className="font-normal not-italic">/ TOP 10</span></h3>
                        </div>
                        <div className="lg:hidden mb-10 space-y-3 font-sans">
                            {magazineData.topLeaders.map((stock, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-[#e2e8f0]">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-black text-[#4338ca] text-xs">#{i+1}</span>
                                            <div className="font-black text-[#0f172a] text-base">{stock.stock_name}</div>
                                        </div>
                                        <div className="text-lg font-black text-[#4338ca]">{stock.total_score.toFixed(1)}</div>
                                    </div>
                                    <div className="pt-2 border-t border-[#f1f5f9]">
                                        {renderDetailedScores(stock)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white border border-[#e2e8f0] p-1.5 shadow-sm mb-12 cursor-pointer group relative" onClick={() => setZoomImage('/api/snapshots/ranking_latest.png')}>
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all flex items-center justify-center z-10">
                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={48} />
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9] mb-4 font-sans">
                                <span className="text-[9px] lg:text-[10px] font-black uppercase flex items-center gap-2" style={{color: '#4338ca'}}><TrendingUp size={16} /> AI Ensemble Summary</span>
                                <span className="text-[8px] lg:text-[9px] font-bold italic tracking-widest uppercase" style={{color: '#94a3b8'}}>08:00 Capture</span>
                            </div>
                            <div className="max-w-[95%] mx-auto bg-[#f8fafc] relative overflow-hidden flex flex-col items-center justify-center border border-[#f1f5f9]">
                                <img src="/api/snapshots/ranking_latest.png" alt="Ranking Board" className="w-full h-auto" crossOrigin="anonymous" />
                                <ImageIcon size={64} style={{color: '#e2e8f0'}} className="absolute z-0" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10 font-sans mb-20">
                            <div className="p-8 bg-white border border-[#e2e8f0] rounded-2xl shadow-sm">
                                <h4 className="text-[9px] font-black uppercase tracking-widest mb-4" style={{color: '#4338ca'}}>Expert Verdict</h4>
                                <p className="text-sm lg:text-base leading-relaxed text-[#475569]">금일 선정된 종목들은 강력한 바닥 탈출 에너지가 포착되었습니다. 추세 전환의 초기 국면으로 판단됩니다.</p>
                            </div>
                            <div className="p-8 rounded-2xl shadow-xl" style={{backgroundColor: '#0f172a'}}>
                                <h4 className="text-[9px] font-black uppercase tracking-widest mb-4" style={{color: '#818cf8'}}>Editor's Note</h4>
                                <p className="text-sm lg:text-base leading-relaxed italic text-white">
                                    "본 데이터는 수급 통계에 기반합니다. 장 시작 후 유입 강도를 확인 후 대응하세요."
                                </p>
                            </div>
                        </div>
                        <div className="mt-20 border-t border-[#e2e8f0] pt-10 flex flex-col items-center opacity-40 font-sans text-center">
                            <div className="text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-center" style={{color: '#64748b'}}>StockPlus Intelligence Analysis Center</div>
                            <p className="text-[8px] lg:text-[9px] text-center max-w-2xl leading-relaxed pb-8" style={{color: '#64748b'}}>© 2026 StockPlus AI Architecture. All Rights Reserved.</p>
                        </div>
                    </section>
                </div>
            </div>

            {zoomImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-md" onClick={() => setZoomImage(null)}></div>
                    <div className="relative w-full max-w-6xl max-h-full overflow-auto rounded-2xl shadow-2xl border border-slate-800">
                        <button onClick={() => setZoomImage(null)} className="absolute top-4 right-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-all"><X size={24} /></button>
                        <img src={zoomImage} alt="Zoomed" className="w-full h-auto" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTheDailyMagazine;
