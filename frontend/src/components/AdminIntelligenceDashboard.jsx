import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Zap, Users, ArrowUpRight, ArrowDownRight, PieChart, Activity, Briefcase, BarChart3, Search, Filter, Sparkles, Target, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

const AdminIntelligenceDashboard = () => {
    const [data, setData] = useState({ heatmap: [], persistence: [], leaders: [], breadth: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [mobileTab, setMobileTab] = useState('heatmap'); // 'overview', 'heatmap', 'themes'
    const [pollInterval, setPollInterval] = useState(180000); // 기본 3분(180초)
    const [selectedSector, setSelectedSector] = useState(null); // [신규] 선택된 업종 (모달용)
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const fetchConfig = async () => {
        try {
            const res = await fetch('/stockPlus/api/admin/collector/config', { headers: getAuthHeader() });
            if (res.ok) {
                const cfg = await res.json();
                if (cfg.collect_interval) {
                    setPollInterval(cfg.collect_interval * 1000); 
                }
            }
        } catch (e) { console.error("Config Fetch Error:", e); }
    };

    const fetchIntelData = async () => {
        try {
            const res = await fetch('/stockPlus/api/admin/intelligence/dashboard', { headers: getAuthHeader() });
            if (res.ok) setData(await res.json());
        } catch (e) {
            console.error("Intel Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchIntelData();
    }, []);

    useEffect(() => {
        if (!pollInterval) return;
        const interval = setInterval(fetchIntelData, pollInterval); 
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

    return (
        <div className="flex-1 bg-slate-950 p-3 lg:p-8 overflow-y-auto custom-scrollbar h-full flex flex-col gap-4 lg:gap-6 relative pb-20 lg:pb-8">
            <header className="flex justify-between items-end shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-1.5 bg-indigo-600/20 rounded-lg border border-indigo-500/30">
                            <LayoutDashboard className="text-indigo-400" size={20} />
                        </div>
                        <h1 className="text-lg lg:text-2xl font-black text-white tracking-tight uppercase italic">Intelligence</h1>
                    </div>
                    <p className="text-slate-500 text-[9px] lg:text-xs font-bold uppercase tracking-widest opacity-80">v1 Next-Gen Engine</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live {pollInterval/1000}s</span>
                </div>
            </header>

            {/* [모바일] 탭에 따라 요약 카드 표시 여부 결정 (Overview 탭이거나 데스크톱일 때만 표시) */}
            <div className={classNames("grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0", mobileTab !== 'overview' && 'hidden lg:grid')}>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20">
                    <span className="text-[9px] font-black text-slate-500 uppercase mb-1">상승 업종 비율 (ADR)</span>
                    <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl lg:text-2xl font-black text-rose-400">{data.breadth?.rising_count || 0}</span>
                            <span className="text-[8px] font-bold text-slate-600 uppercase">Sectors</span>
                        </div>
                        <span className="text-[10px] font-black text-indigo-400">{((data.breadth?.rising_count / (data.breadth?.rising_count + data.breadth?.falling_count || 1)) * 100).toFixed(0)}%</span>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20">
                    <span className="text-[9px] font-black text-slate-500 uppercase mb-1">하락 비중 (%)</span>
                    <div className="flex items-baseline justify-between">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl lg:text-2xl font-black text-blue-400">{data.breadth?.falling_count || 0}</span>
                            <span className="text-[8px] font-bold text-slate-600 uppercase">Sectors</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-500">{((data.breadth?.falling_count / (data.heatmap?.length || 1)) * 100).toFixed(0)}%</span>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20">
                    <span className="text-[9px] font-black text-slate-500 uppercase mb-1">시장 강도 (Strength)</span>
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-400" />
                        <span className="text-xl lg:text-2xl font-black text-indigo-400 font-mono">
                            {((data.breadth?.rising_count / (data.breadth?.falling_count || 1)) * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>
                {/* [신규] 4번째 카드: 오늘의 주도 업종 (Top Sector) */}
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-lg flex flex-col justify-center h-18 lg:h-20 overflow-hidden">
                    <span className="text-[9px] font-black text-slate-500 uppercase mb-1">Top Sector (주도)</span>
                    <div className="flex flex-col justify-center h-full">
                        {data.heatmap && data.heatmap.length > 0 ? (
                            <>
                                <span className="text-[11px] lg:text-sm font-black text-white truncate w-full" title={data.heatmap[0].industry_name}>
                                    {data.heatmap[0].industry_name}
                                </span>
                                <span className={classNames("text-[10px] lg:text-xs font-black mt-0.5", parseFloat(data.heatmap[0].change_rate) > 0 ? "text-rose-400" : "text-blue-400")}>
                                    {parseFloat(data.heatmap[0].change_rate) > 0 ? '+' : ''}{data.heatmap[0].change_rate}%
                                </span>
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                <span className="text-[9px] font-bold text-slate-500">Wait...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
                {/* 업종별 등락 히트맵 */}
                <div className={classNames(
                    "col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-2xl flex flex-col h-full overflow-hidden",
                    mobileTab !== 'heatmap' && 'hidden lg:flex'
                )}>
                    <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0">
                        <h2 className="text-sm lg:text-lg font-bold text-white flex items-center gap-2 lg:gap-3">
                            <PieChart size={18} className="text-indigo-400" /> 업종 등락 히트맵
                        </h2>
                        {/* [신규] Top 50 배지 */}
                        <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">Top 50 상세</span>
                    </div>
                    {/* [모바일] aspect-[2/1] 적용하여 타일 높이를 절반으로 축소 */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-2 lg:gap-2.5 overflow-y-auto custom-scrollbar-thin pr-1 flex-1 pb-2 content-start">
                        {data.heatmap?.map((item, idx) => {
                            return (
                            <div key={idx} 
                                onClick={() => setSelectedSector(item)} 
                                className={classNames(
                                "relative aspect-[2/1] lg:aspect-[4/3] rounded-lg lg:rounded-xl p-2 lg:p-3 flex flex-col justify-center items-center lg:justify-between lg:items-start transition-all hover:scale-[1.02] active:scale-95 cursor-pointer border border-white/5 text-center lg:text-left",
                                getHeatmapColor(item.change_rate)
                            )}>
                                {/* [v13] AI Signal Indicator */}
                                {item.ai_signal === 'BUY' && (
                                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white border border-rose-500"></span>
                                    </span>
                                )}
                                {item.ai_signal === 'SELL' && (
                                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-900 border border-blue-400"></span>
                                )}

                                <span className="text-[10px] lg:text-[12px] font-black text-white leading-tight drop-shadow-md truncate w-full pr-2">{item.industry_name}</span>
                                <div className="mt-0.5 lg:mt-0 lg:text-right w-full">
                                    <span className="text-[11px] lg:text-base font-black text-white drop-shadow-md">{parseFloat(item.change_rate) > 0 ? '+' : ''}{item.change_rate}%</span>
                                </div>
                            </div>
                        )})}
                    </div>
                </div>

                {/* Hot Themes */}
                <div className={classNames(
                    "col-span-12 lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-4 lg:p-6 shadow-2xl flex flex-col h-full overflow-hidden",
                    mobileTab !== 'themes' && 'hidden lg:flex'
                )}>
                    <div className="flex justify-between items-center mb-4 lg:mb-6 shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm lg:text-lg font-bold text-white flex items-center gap-2">
                                <Zap size={18} className="text-yellow-400" /> Hot Themes
                            </h2>
                            <span className="text-[10px] text-slate-500 font-medium mt-1">(3일 누적)</span>
                        </div>
                        <div className="flex items-center gap-1.5 lg:gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded-md bg-slate-800 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-[10px] font-black text-slate-500 font-mono whitespace-nowrap">{currentPage}/{totalPages || 1}</span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded-md bg-slate-800 text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2 lg:space-y-3 overflow-y-auto custom-scrollbar-thin pr-1 flex-1 pb-2">
                        {paginatedThemes?.map((theme, idx) => (
                            <div key={idx} className="bg-slate-950/50 border border-slate-800/50 rounded-xl lg:rounded-2xl p-3 lg:p-4 flex flex-col gap-1.5 lg:gap-2 hover:border-indigo-500/50 transition-all shadow-inner group h-auto min-h-[70px]">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                        <span className="text-[12px] lg:text-sm font-bold text-white group-hover:text-indigo-400 transition-colors break-words leading-tight flex-1">
                                            {theme.theme_name}
                                        </span>
                                        <span className={classNames(
                                            "text-[8px] lg:text-[10px] font-black uppercase px-1.5 lg:px-2 py-0.5 rounded border whitespace-nowrap shrink-0", 
                                            parseFloat(theme.total_score) >= 10 ? "text-rose-400 border-rose-400/20 bg-rose-400/10" : 
                                            (parseFloat(theme.total_score) >= 5 ? "text-cyan-400 border-cyan-400/20 bg-cyan-400/10" : "text-slate-500 border-slate-700 bg-slate-800/50")
                                        )}>
                                            {parseFloat(theme.total_score) >= 10 ? 'Hot' : (parseFloat(theme.total_score) >= 5 ? 'Track' : 'Normal')}
                                        </span>
                                    </div>
                                    <span className="text-[11px] lg:text-[12px] font-black text-white shrink-0">
                                        {parseFloat(theme.total_score || 0).toFixed(1)}
                                    </span>
                                </div>
                                <div className="bg-slate-900 rounded-lg border border-slate-800 w-full p-2">
                                    <div className="flex items-start gap-2">
                                        <Target size={10} className="text-cyan-500 shrink-0 mt-1" />
                                        <span className="text-[9px] font-bold text-slate-300 break-all whitespace-normal leading-relaxed block w-full">
                                            {theme.lead_stocks || '대장주 분석 중...'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* [모바일] 하단 고정 네비게이션 바 */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around items-center h-16 lg:hidden z-50 pb-safe">
                <button 
                    onClick={() => setMobileTab('overview')}
                    className={classNames("flex flex-col items-center gap-1 p-2 w-full transition-colors", mobileTab === 'overview' ? "text-indigo-400" : "text-slate-500")}
                >
                    <Activity size={20} />
                    <span className="text-[10px] font-bold">대시보드</span>
                </button>
                <button 
                    onClick={() => setMobileTab('heatmap')}
                    className={classNames("flex flex-col items-center gap-1 p-2 w-full transition-colors", mobileTab === 'heatmap' ? "text-indigo-400" : "text-slate-500")}
                >
                    <PieChart size={20} />
                    <span className="text-[10px] font-bold">히트맵</span>
                </button>
                <button 
                    onClick={() => setMobileTab('themes')}
                    className={classNames("flex flex-col items-center gap-1 p-2 w-full transition-colors", mobileTab === 'themes' ? "text-indigo-400" : "text-slate-500")}
                >
                    <Zap size={20} />
                    <span className="text-[10px] font-bold">핫 테마</span>
                </button>
            </div>

            {/* [신규] 업종 상세 모달 (Drill-down) */}
            {selectedSector && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedSector(null)}></div>
                    <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
                            <div className="flex-1 mr-2">
                                <h3 className="text-lg font-black text-white leading-tight break-keep">{selectedSector.industry_name}</h3>
                                <span className={classNames("text-sm font-bold", parseFloat(selectedSector.change_rate) > 0 ? "text-rose-400" : "text-blue-400")}>
                                    {parseFloat(selectedSector.change_rate) > 0 ? '+' : ''}{selectedSector.change_rate}%
                                </span>
                            </div>
                            <button onClick={() => setSelectedSector(null)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 transition-colors shrink-0">
                                <ArrowDownRight size={20} className="rotate-45" /> {/* Close Icon */}
                            </button>
                        </div>
                        <div className="p-6">
                            <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <Target size={14} className="text-cyan-500" /> Leading Stocks
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedSector.lead_stocks ? (
                                    selectedSector.lead_stocks.split(',').map((stock, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 hover:border-indigo-500 hover:text-indigo-400 transition-colors cursor-default whitespace-normal h-auto text-center">
                                            {stock.trim()}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 italic">
                                        데이터 분석 중이거나<br/>Top 50 업종이 아닙니다.
                                    </p>
                                )}
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-800/50 text-center">
                                <p className="text-[10px] text-slate-600">Top 50 업종만 상세 분석이 제공됩니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminIntelligenceDashboard;
