import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, Download, Calendar, TrendingUp, ChevronRight, Brain, Image as ImageIcon, Map, Activity, Clock, FileText, CheckCircle2, Lock, AlertTriangle, Loader2, ListOrdered, Award, X, Maximize2 } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';
import html2canvas from 'html2canvas-pro'; 
import jsPDF from 'jspdf';

const AdminTheDailyMagazine = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloadable, setIsDownloadable] = useState(false);
    const [magazineData, setMagazineData] = useState({
        date: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
        headline: "데이터가 가리키는 오늘의 주도주 맥점",
        marketBrief: "데이터 분석 중...",
        stockComments: ["-", "-", "-"],
        topLeaders: [],
        indices: { kospi: '-', kospiRate: '-', kosdaq: '-', kosdaqRate: '-' }
    });
    
    const [zoomImage, setZoomImage] = useState(null);
    const magazineRef = useRef();

    const checkTime = () => {
        setIsDownloadable(true);
    };

    const parseBriefing = (raw) => {
        const parts = { market: "", stocks: ["-", "-", "-"] };
        try {
            const marketMatch = raw.match(/\[MARKET_BRIEF\](.*?)(\[STOCK_1\]|\[STOCK_2\]|\[STOCK_3\]|$)/s);
            if (marketMatch) parts.market = marketMatch[1].trim();
            for (let i = 1; i <= 3; i++) {
                const stockMatch = raw.match(new RegExp(`\\[STOCK_${i}\\](.*?)(?=\\[STOCK_${i+1}\\]|$)`, "s"));
                if (stockMatch) parts.stocks[i-1] = stockMatch[1].trim();
            }
        } catch (e) {}
        return parts;
    };

    const fetchMagazineData = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/stockPlus/api/admin/magazine/data', { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                const parsed = parseBriefing(data.briefing);
                const kospi = data.indices?.find(idx => idx.index_name === 'KOSPI') || {};
                const kosdaq = data.indices?.find(idx => idx.index_name === 'KOSDAQ') || {};

                setMagazineData({
                    date: new Date(data.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
                    headline: data.leaders.length > 0 ? `${data.leaders[0].stock_name} 등 바닥 탈출 주도주 포착` : "지능형 투자 브리핑",
                    marketBrief: parsed.market,
                    stockComments: parsed.stocks,
                    topLeaders: data.leaders,
                    indices: {
                        kospi: kospi.index_value?.toLocaleString() || '-',
                        kospiRate: (kospi.change_rate >= 0 ? '+' : '') + (kospi.change_rate || '0') + '%',
                        kosdaq: kosdaq.index_value?.toLocaleString() || '-',
                        kosdaqRate: (kosdaq.change_rate >= 0 ? '+' : '') + (kosdaq.change_rate || '0') + '%'
                    }
                });
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
            
            const images = element.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return img.decode().catch(() => {});
                return new Promise(resolve => {
                    img.onload = () => img.decode().then(resolve).catch(resolve);
                    img.onerror = resolve;
                    setTimeout(resolve, 3000);
                });
            }));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#f8f5f0",
                windowWidth: 1200,
                onclone: (clonedDoc) => {
                    const style = clonedDoc.createElement('style');
                    style.innerHTML = `
                        h1, h2, h3, h4, p, span, td, th { line-height: 1.6 !important; }
                        .rank-title-row { pt-3 !important; }
                        .analysis-tag { font-family: sans-serif !important; font-weight: 900 !important; color: #3730a3 !important; }
                    `;
                    clonedDoc.head.appendChild(style);
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`StockPlus_Daily_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("PDF ERROR:", e);
            alert("PDF 발행 중 기술적 오류가 발생했습니다.");
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
        <div className="flex-1 bg-[#0f172a] h-full overflow-hidden flex flex-col relative font-sans">
            <div className="h-14 bg-[#1e293b] border-b border-[#334155] flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <div className={classNames(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        isDownloadable ? "bg-[#10b98120] text-[#10b981] border-[#10b98130]" : "bg-[#f43f5e20] text-[#f43f5e] border-[#f43f5e30]"
                    )}>
                        {isDownloadable ? <Activity size={12} className="animate-pulse" /> : <Lock size={12} />}
                        {isDownloadable ? "PREMIUM READY" : "REPORT WAITING"}
                    </div>
                </div>
                <button 
                    onClick={handleGeneratePdf} 
                    disabled={!isDownloadable || isLoading} 
                    style={{ backgroundColor: isDownloadable ? '#4f46e5' : '#334155' }} 
                    className={classNames(
                        "px-6 py-2 rounded-xl font-black text-xs text-white flex items-center gap-2 transition-all shadow-lg",
                        !isDownloadable ? "cursor-not-allowed opacity-50" : "active:scale-95 hover:bg-[#4338ca]"
                    )}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={14} /> : (isDownloadable ? <Download size={14} /> : <Lock size={14} />)} 
                    {isDownloadable ? "📄 PDF REPORT 발행" : "발행 제한 해제됨"}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f5f0]">
                <div ref={magazineRef} style={{backgroundColor: '#f8f5f0'}} className="max-w-4xl mx-auto p-10 lg:p-20 text-[#1e293b] overflow-hidden">
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

                    <section className="mb-16">
                        <div className="border-b border-[#cbd5e1] pb-10 mb-12">
                            <h2 className="text-xl lg:text-4xl font-black leading-tight mb-8 break-keep underline underline-offset-8 pb-2" style={{color: '#0f172a', textDecorationColor: 'rgba(79, 70, 229, 0.3)'}}>
                                "{magazineData.headline}"
                            </h2>
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
                            <h3 className="text-xl lg:text-3xl font-black uppercase tracking-tight italic" style={{color: '#0f172a'}}>Industry Mapping</h3>
                        </div>
                        <div className="bg-white border border-[#e2e8f0] p-1.5 shadow-sm mb-10 cursor-pointer group relative" onClick={() => setZoomImage('/stockPlus/api/snapshots/heatmap_latest.png')}>
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all flex items-center justify-center z-10">
                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={48} />
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9] mb-4 font-sans">
                                <span className="text-[9px] lg:text-[10px] font-black uppercase flex items-center gap-2" style={{color: '#4338ca'}}>Closing Map Snapshot</span>
                                <span className="text-[8px] lg:text-[9px] font-bold italic tracking-widest uppercase" style={{color: '#94a3b8'}}>23:00 Capture</span>
                            </div>
                            <div className="max-w-[95%] mx-auto bg-[#f8fafc] relative overflow-hidden flex flex-col items-center justify-center border border-[#f1f5f9]">
                                <img src="/stockPlus/api/snapshots/heatmap_latest.png" alt="Heatmap" className="w-full h-auto" crossOrigin="anonymous" />
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
                        <div className="bg-white border border-[#e2e8f0] p-1.5 shadow-sm mb-12 cursor-pointer group relative" onClick={() => setZoomImage('/stockPlus/api/snapshots/ranking_latest.png')}>
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-all flex items-center justify-center z-10">
                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={48} />
                            </div>
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9] mb-4 font-sans">
                                <span className="text-[9px] lg:text-[10px] font-black uppercase flex items-center gap-2" style={{color: '#4338ca'}}><TrendingUp size={16} /> AI Ensemble Summary</span>
                                <span className="text-[8px] lg:text-[9px] font-bold italic tracking-widest uppercase" style={{color: '#94a3b8'}}>08:00 Capture</span>
                            </div>
                            <div className="max-w-[95%] mx-auto bg-[#f8fafc] relative overflow-hidden flex flex-col items-center justify-center border border-[#f1f5f9]">
                                <img src="/stockPlus/api/snapshots/ranking_latest.png" alt="Ranking Board" className="w-full h-auto" crossOrigin="anonymous" />
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
