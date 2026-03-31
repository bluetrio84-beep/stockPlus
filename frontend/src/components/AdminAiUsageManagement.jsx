import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Activity, Brain, PieChart, TrendingUp, Clock, AlertCircle, Loader2, RefreshCw, Zap, Wallet, ShieldAlert } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import classNames from 'classnames';

const AdminAiUsageManagement = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState([]);
    const [typeStats, setTypeStats] = useState([]);
    const [summary, setSummary] = useState({ total: 0, prompt: 0, completion: 0 });

    const COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b'];

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [dailyRes, typeRes] = await Promise.all([
                fetch('/api/admin/system/ai-stats/daily', { headers: getAuthHeader() }),
                fetch('/api/admin/system/ai-stats/type', { headers: getAuthHeader() })
            ]);

            if (dailyRes.ok && typeRes.ok) {
                const daily = await dailyRes.json();
                const type = await typeRes.json();
                setDailyStats(daily);
                setTypeStats(type);

                if (daily.length > 0) {
                    const today = daily[daily.length - 1];
                    setSummary({
                        total: today.total_tokens,
                        prompt: today.prompt_tokens,
                        completion: today.completion_tokens
                    });
                }
            }
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const renderCard = (title, value, unit, IconComponent, color) => (
        <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl p-3 shadow-md relative overflow-hidden group">
            <div className={classNames("absolute top-0 right-0 w-12 h-12 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-150 duration-700 opacity-10", color)}></div>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-xl font-black text-[var(--theme-text)]">{value.toLocaleString()}</h3>
                        <span className="text-[10px] font-bold text-slate-500">{unit}</span>
                    </div>
                </div>
                <div className={classNames("p-1.5 rounded-lg bg-opacity-10", color)}>
                    <IconComponent size={16} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[var(--theme-bg)]">
                <Loader2 className="w-12 h-12 text-[var(--theme-point)] animate-spin mb-4" />
                <p className="text-sm font-black text-slate-500 animate-pulse uppercase tracking-[0.2em]">AI Usage Intelligence Loading...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex-1 flex flex-col bg-[var(--theme-bg)] p-4 lg:pt-6 lg:px-8 lg:pb-4 overflow-y-auto custom-scrollbar transition-colors duration-500 min-h-0">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-[var(--theme-text)] tracking-tight flex items-center gap-3">
                        <Brain className="text-[var(--theme-point)]" size={28} />
                        AI USAGE MANAGEMENT
                    </h1>
                </div>
                <button 
                    onClick={fetchData}
                    className="px-4 py-2 bg-[var(--theme-point)] text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                    <RefreshCw size={14} /> REFRESH METRICS
                </button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {renderCard("Today Requests", dailyStats.length > 0 ? dailyStats[dailyStats.length-1].request_count || 0 : 0, " / 1,500", Zap, "bg-amber-500")}
                {renderCard("Today Total Tokens", summary.total, "tokens", Brain, "bg-indigo-500")}
                {renderCard("Prompt Tokens", summary.prompt, "tokens", Activity, "bg-cyan-500")}
                {renderCard("Completion Tokens", summary.completion, "tokens", TrendingUp, "bg-emerald-500")}
                {renderCard("Estimated Cost", (summary.total * 0.000001).toFixed(4), "USD", Wallet, "bg-rose-500")}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Usage Trend Line Chart */}
                <div className="lg:col-span-2 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[25px] p-6 shadow-xl">
                    <h3 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                        <TrendingUp size={16} className="text-[var(--theme-point)]" /> Token Usage Trend (Last 7 Days)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyStats}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" opacity={0.5} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#64748b'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold', fill: '#64748b'}} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: 'var(--theme-header)', border: '1px solid var(--theme-border)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'}}
                                />
                                <Area type="monotone" dataKey="total_tokens" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Type Distribution Pie Chart */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[25px] p-6 shadow-xl">
                    <h3 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <PieChart size={16} className="text-rose-500" /> By Request Type
                    </h3>
                    <div className="h-[300px] w-full flex flex-col items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={typeStats}
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {typeStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{backgroundColor: 'var(--theme-header)', border: '1px solid var(--theme-border)', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'}}
                                />
                                <Legend verticalAlign="bottom" align="center" wrapperStyle={{paddingTop: '10px', fontSize: '10px', fontWeight: 'bold'}} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Intelligence Notice */}
            <div className="p-6 bg-indigo-600 rounded-[30px] text-white shadow-xl relative overflow-hidden mb-20">
                <Brain className="absolute bottom-[-10px] right-[-10px] opacity-10" size={120} />
                <h4 className="text-xs font-black uppercase tracking-widest mb-3 opacity-80 flex items-center gap-2">
                    <ShieldAlert size={16} className="text-amber-400" /> AI GOVERNANCE & POLICY
                </h4>
                <div className="space-y-4 relative z-10">
                    <p className="text-sm lg:text-base leading-relaxed font-black italic border-l-4 border-amber-400/50 pl-4 py-1">
                        "현재 시스템은 <span className="text-amber-300">Gemini 2.0 Flash</span> 모델을 주력으로 사용 중입니다. 효율적인 자원 관리를 위해 컨텍스트 최적화가 상시 가동되고 있습니다."
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                            <p className="text-[9px] font-black uppercase opacity-60 mb-1">Daily Requests (RPD)</p>
                            <p className="text-sm font-black text-amber-300">1,500 / Day</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                            <p className="text-[9px] font-black uppercase opacity-60 mb-1">Tokens Per Min (TPM)</p>
                            <p className="text-sm font-black text-amber-300">4,000,000 / Min</p>
                        </div>
                        <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                            <p className="text-[9px] font-black uppercase opacity-60 mb-1">Requests Per Min (RPM)</p>
                            <p className="text-sm font-black text-amber-300">10 / Min</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAiUsageManagement;
