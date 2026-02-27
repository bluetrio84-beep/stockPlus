import React, { useState, useEffect, useCallback } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, ReferenceLine, Cell } from 'recharts';
import { getAuthHeader } from '../api/stockApi';
import { Maximize2, Loader2, ArrowLeft, X, TrendingUp, BarChart2 } from 'lucide-react';
import classNames from 'classnames';

const AdminChartDashboard = () => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeBubble, setActiveBubble] = useState(null); // 현재 클릭된 버블 정보
    const [leadStocksInfo, setLeadStocksInfo] = useState(null); // 주도주 목록 정보
    const [isFetchingLead, setIsFetchingLead] = useState(false);

    const fetchChartData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/stockPlus/api/admin/intelligence/dashboard', { headers: getAuthHeader() });
            if (res.ok) {
                const json = await res.json();
                if (json.heatmap) {
                    const processed = json.heatmap.map(item => ({
                        name: item.industry_name,
                        x: parseFloat(item.change_rate || 0),
                        y: parseInt(item.ai_score || 50),
                        z: parseInt(item.trade_amount || 0) / 100,
                        signal: item.ai_signal || 'WAIT'
                    })).filter(d => d.z > 0);
                    setData(processed);
                }
                setLastUpdated(new Date());
            }
        } catch (e) {
            console.error("Chart Data Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChartData();
        const interval = setInterval(fetchChartData, 60000);
        return () => clearInterval(interval);
    }, [fetchChartData]);

    const fetchLeadStocks = async (industryName) => {
        try {
            setIsFetchingLead(true);
            const res = await fetch(`/stockPlus/api/admin/intelligence/industry?industryName=${encodeURIComponent(industryName)}`, { headers: getAuthHeader() });
            if (res.ok) {
                const json = await res.json();
                setLeadStocksInfo(json.leadStocks || "정보 없음");
            }
        } catch (e) {
            setLeadStocksInfo("정보 로드 실패");
        } finally {
            setIsFetchingLead(false);
        }
    };

    const onScatterClick = (node) => {
        if (node && node.payload) {
            setActiveBubble(node.payload);
            setLeadStocksInfo(null); // 새 버블 클릭 시 이전 주도주 정보 초기화
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (activeBubble) {
            const d = activeBubble;
            return (
                <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl shadow-2xl z-50 pointer-events-auto min-w-[220px] relative transition-all duration-300">
                    <button 
                        onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            setActiveBubble(null);
                            setLeadStocksInfo(null);
                        }}
                        className="absolute top-3 right-3 text-slate-500 hover:text-white p-1 transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <p className="text-base font-black text-white mb-3 pb-2 border-b border-slate-800 flex justify-between items-center gap-2 pr-8">
                        <span>{d.name}</span>
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-[11px] mb-5">
                        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex flex-col gap-0.5">
                            <span className="text-slate-500 font-bold uppercase tracking-tighter">등락률</span>
                            <span className={classNames("text-sm font-black", d.x > 0 ? "text-rose-400" : "text-blue-400")}>{d.x}%</span>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex flex-col gap-0.5">
                            <span className="text-slate-500 font-bold uppercase tracking-tighter">AI 점수</span>
                            <span className="text-sm font-black text-indigo-400">{d.y}점</span>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex flex-col gap-0.5">
                            <span className="text-slate-500 font-bold uppercase tracking-tighter">AI 신호</span>
                            <span className={classNames("text-sm font-black", d.signal === 'BUY' ? "text-rose-400" : (d.signal === 'SELL' ? "text-blue-400" : "text-slate-500"))}>{d.signal}</span>
                        </div>
                        <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex flex-col gap-0.5">
                            <span className="text-slate-500 font-bold uppercase tracking-tighter">거래대금</span>
                            <span className="text-sm font-black text-white font-mono">{Math.round(d.z).toLocaleString()}억</span>
                        </div>
                    </div>
                    
                    {leadStocksInfo ? (
                        <div className="bg-indigo-600/10 border border-indigo-500/30 p-3 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-2 flex items-center gap-1.5">
                                <TrendingUp size={12} /> 주도주 TOP 5
                            </h4>
                            <div className="text-[11px] text-slate-200 leading-relaxed font-bold break-keep">
                                {leadStocksInfo.split(',').map((s, idx) => (
                                    <div key={idx} className="flex items-center gap-2 mb-1 last:mb-0">
                                        <span className="w-3 h-3 bg-indigo-600/40 text-[8px] flex items-center justify-center rounded-full text-indigo-300">{idx+1}</span>
                                        <span>{s.trim()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <button 
                            onClick={(e) => {
                                e.preventDefault(); e.stopPropagation();
                                fetchLeadStocks(d.name);
                            }}
                            disabled={isFetchingLead}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isFetchingLead ? <Loader2 size={14} className="animate-spin" /> : <Maximize2 size={14} />}
                            상세 주도주 보기
                        </button>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-1 bg-slate-950 p-2 lg:p-8 h-full flex flex-col gap-4 lg:gap-6 overflow-hidden relative pb-20 lg:pb-5">
            <header className="flex justify-between items-end shrink-0">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-rose-600/20 rounded-lg border border-rose-500/30">
                            <BarChart2 className="text-rose-400" size={20} />
                        </div>
                        <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight uppercase italic">Market Bubble</h1>
                    </div>
                    <p className="text-slate-500 text-[10px] lg:text-xs font-bold uppercase tracking-widest opacity-80 italic">Sector Intelligence</p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                    {lastUpdated && (
                        <span className="text-[10px] text-slate-600 font-mono italic">
                            Updated: {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    )}
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Rising</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div><span className="text-[9px] text-slate-400 font-bold uppercase">Falling</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-1 lg:p-6 shadow-2xl relative overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <span className="text-xs font-bold uppercase tracking-widest">Visualizing Market...</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart 
                            margin={{ top: 20, right: 15, bottom: 10, left: -15 }}
                            onClick={() => { setActiveBubble(null); setLeadStocksInfo(null); }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis 
                                type="number" dataKey="x" name="등락률" unit="%" stroke="#64748b" 
                                tick={{fontSize: 10, fill: '#94a3b8'}} 
                                domain={['dataMin - 0.5', 'dataMax + 0.5']} 
                            />
                            <YAxis 
                                type="number" dataKey="y" name="AI점수" unit="점" width={45} stroke="#64748b" 
                                tick={{fontSize: 10, fill: '#94a3b8'}} domain={[0, 100]} 
                            />
                            <ZAxis type="number" dataKey="z" range={[50, 4000]} name="거래대금" unit="억" />
                            <Tooltip 
                                content={<CustomTooltip />} 
                                active={!!activeBubble} 
                                coordinate={activeBubble ? undefined : { x: 0, y: 0 }}
                                wrapperStyle={{ pointerEvents: 'auto', zIndex: 1000 }}
                            />
                            <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
                            <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                            <Scatter 
                                name="Sectors" data={data} 
                                onClick={(data, index, e) => { e.stopPropagation(); onScatterClick(data); }}
                                className="cursor-pointer"
                            >
                                {data.map((entry, index) => {
                                    const isSignal = entry.signal === 'BUY' || entry.signal === 'SELL';
                                    return (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.x > 0 ? '#f43f5e' : '#3b82f6'} 
                                            fillOpacity={isSignal ? 0.9 : 0.4} 
                                            stroke={entry.x > 0 ? '#fb7185' : '#60a5fa'} 
                                            strokeWidth={isSignal ? 3 : 1}
                                        />
                                    );
                                })}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default AdminChartDashboard;
