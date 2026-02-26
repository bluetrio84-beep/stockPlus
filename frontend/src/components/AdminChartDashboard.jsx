import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, ReferenceLine, Cell } from 'recharts';
import { getAuthHeader } from '../api/stockApi';
import { Maximize2, Loader2, Activity, PieChart, Zap, BarChart2 } from 'lucide-react';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';

const AdminChartDashboard = () => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const navigate = useNavigate();

    const fetchChartData = async () => {
        try {
            const res = await fetch('/stockPlus/api/admin/intelligence/dashboard', { headers: getAuthHeader() });
            if (res.ok) {
                const json = await res.json();
                if (json.heatmap) {
                    const processed = json.heatmap.map(item => ({
                        name: item.industry_name,
                        x: parseFloat(item.change_rate || 0),
                        y: parseInt(item.ai_score || 50),
                        z: parseInt(item.trade_amount || 0) / 100, // 백만 -> 억 단위 변환
                        raw_amount: parseInt(item.trade_amount || 0),
                        signal: item.ai_signal || 'WAIT'
                    })).filter(d => d.z > 0);
                    setData(processed);
                    setLastUpdated(new Date());
                }
            }
        } catch (e) {
            console.error("Chart Data Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChartData();
        const interval = setInterval(fetchChartData, 60000);
        return () => clearInterval(interval);
    }, []);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl z-50">
                    <p className="text-sm font-black text-white mb-1">{d.name}</p>
                    <div className="space-y-0.5 text-xs text-slate-300">
                        <p>등락률: <span className={d.x > 0 ? "text-rose-400 font-bold" : "text-blue-400 font-bold"}>{d.x}%</span></p>
                        <p>AI 점수: <span className="text-indigo-400 font-bold">{d.y}점</span></p>
                        <p>AI 신호: <span className={classNames("font-black", d.signal === 'BUY' ? 'text-rose-400' : (d.signal === 'SELL' ? 'text-blue-400' : 'text-slate-500'))}>{d.signal}</span></p>
                        <p>거래대금: <span className="text-white font-mono">{Math.round(d.z).toLocaleString()}억</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex-1 bg-slate-950 p-2 lg:p-8 h-full flex flex-col gap-4 lg:gap-6 overflow-hidden relative pb-20 lg:pb-8">
            <header className="flex justify-between items-end shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-1.5 bg-rose-600/20 rounded-lg border border-rose-500/30">
                            <Maximize2 className="text-rose-400" size={20} />
                        </div>
                        <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight uppercase italic">Market Bubble</h1>
                    </div>
                    <p className="text-slate-500 text-[10px] lg:text-xs font-bold uppercase tracking-widest opacity-80">
                        v2 Visual Analytics
                    </p>
                </div>
                {/* [v2.7] 범례 헤더로 이동 및 레이아웃 정리 */}
                <div className="flex flex-col items-end gap-2">
                    {lastUpdated && (
                        <span className="text-[10px] text-slate-600 font-mono">
                            Updated: {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    )}
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]"></div><span className="text-[9px] text-slate-400 font-bold">Rising</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div><span className="text-[9px] text-slate-400 font-bold">Falling</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl lg:rounded-3xl p-1 lg:p-6 shadow-2xl relative overflow-hidden flex flex-col">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <span className="text-xs font-bold">데이터 시각화 중...</span>
                    </div>
                ) : (
                    <>
                        {/* [v2.7] 차트 내부 범례 제거됨 */}
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 10, bottom: 10, left: -15 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" dataKey="x" name="등락률" unit="%" stroke="#64748b" tick={{fontSize: 10, fill: '#94a3b8'}} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                                <YAxis type="number" dataKey="y" name="AI점수" unit="점" width={45} stroke="#64748b" tick={{fontSize: 10, fill: '#94a3b8'}} domain={[0, 100]} />
                                <ZAxis type="number" dataKey="z" range={[50, 4000]} name="거래대금" unit="억" />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
                                <ReferenceLine y={50} stroke="#475569" strokeDasharray="3 3" />
                                <Scatter name="Sectors" data={data}>
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
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminChartDashboard;
