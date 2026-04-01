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

    const TYPE_MAP = {
        'STOCK_ANALYSIS': '종목 심층 분석',
        'MAGAZINE_ANALYSIS': '매거진 시황 분석',
        'NEWS_SUMMARY': '뉴스 핵심 요약',
        'MARKET_INSIGHT': '시장 인사이트',
        'SPECIAL_ANALYSIS': '관심종목 분석',
        'GENERAL_TASK': '일반 분석 작업'
    };

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
                
                // [v16.27] 범례 한글화 매핑 적용
                const translatedType = type.map(item => ({
                    ...item,
                    name: TYPE_MAP[item.name] || item.name
                }));
                setTypeStats(translatedType);

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
        <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl py-2.5 px-4 shadow-xl relative overflow-hidden group transition-all">
            <div className={classNames("absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700 opacity-10", color)}></div>
            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-xl lg:text-2xl font-black text-[var(--theme-text)] tracking-tighter transition-colors">{value.toLocaleString()}</h3>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{unit}</span>
                    </div>
                </div>
                <div className={classNames("p-2.5 rounded-xl bg-opacity-10 shadow-inner transition-colors", color)}>
                    <IconComponent size={20} className={color.replace('bg-', 'text-')} />
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[var(--theme-bg)]">
                <Loader2 className="w-16 h-16 text-[var(--theme-point)] animate-spin mb-6" />
                <p className="text-base font-black text-slate-500 animate-pulse uppercase tracking-[0.3em]">AI Usage Intelligence Loading...</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex-1 flex flex-col bg-[var(--theme-bg)] p-4 lg:pt-8 lg:px-6 lg:pb-10 overflow-y-auto custom-scrollbar transition-colors duration-500 min-h-0">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 px-2">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-[var(--theme-text)] tracking-tighter flex items-center gap-4 transition-colors">
                        <Brain className="text-[var(--theme-point)]" size={32} />
                        AI USAGE INTELLIGENCE
                    </h1>
                    <p className="text-xs text-slate-500 font-bold mt-1 lg:ml-12 uppercase tracking-[0.2em] opacity-80 transition-colors">Gemini API Consumption Control</p>
                </div>
                <button 
                    onClick={fetchData}
                    className="px-6 py-2 bg-[var(--theme-point)] text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-xl active:scale-95 transition-all"
                >
                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> REFRESH
                </button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 px-2">
                {renderCard("Today Requests", dailyStats.length > 0 ? dailyStats[dailyStats.length-1].request_count || 0 : 0, " / 1,500", Zap, "bg-amber-500")}
                {renderCard("Total Tokens", summary.total, "tokens", Brain, "bg-indigo-500")}
                {renderCard("Prompt", summary.prompt, "tokens", Activity, "bg-cyan-500")}
                {renderCard("Completion", summary.completion, "tokens", TrendingUp, "bg-emerald-500")}
                {renderCard("Est. Cost", (summary.total * 0.000001).toFixed(4), "USD", Wallet, "bg-rose-500")}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 px-2">
                {/* Usage Trend Line Chart */}
                <div className="lg:col-span-8 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[2rem] p-6 shadow-2xl transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-[0.3em] flex items-center gap-3 transition-colors">
                            <TrendingUp size={18} className="text-[var(--theme-point)]" /> Token Usage Trend (Last 7 Days)
                        </h3>
                    </div>
                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyStats}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" opacity={0.3} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: 'var(--theme-header)', border: '1px solid var(--theme-border)', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--theme-text)'}}
                                    itemStyle={{color: 'var(--theme-point)'}}
                                    labelStyle={{color: 'var(--theme-text)', opacity: 0.7}}
                                />
                                <Area type="monotone" dataKey="total_tokens" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Type Distribution Pie Chart */}
                <div className="lg:col-span-4 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[2rem] p-6 shadow-2xl transition-colors flex flex-col">
                    <h3 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-[0.3em] mb-6 flex items-center gap-3 transition-colors">
                        <PieChart size={18} className="text-rose-500" /> By Request Type
                    </h3>
                    <div className="flex-1 w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={320}>
                            <RePieChart>
                                <Pie
                                    data={typeStats}
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {typeStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{backgroundColor: 'var(--theme-header)', border: '1px solid var(--theme-border)', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--theme-text)'}}
                                    itemStyle={{color: 'var(--theme-text)'}}
                                />
                                <Legend verticalAlign="bottom" align="center" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold'}} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Intelligence Notice */}
            <div className="p-5 lg:p-6 bg-indigo-600 rounded-[3rem] text-white shadow-2xl relative overflow-hidden mb-20 mx-2 min-h-[480px] lg:min-h-[220px]">
                <Brain className="absolute bottom-[-30px] right-[-30px] opacity-10" size={200} />
                <h4 className="text-sm lg:text-lg font-black uppercase tracking-[0.3em] mb-3 opacity-90 flex items-center gap-4">
                    <ShieldAlert size={24} className="text-amber-400" /> AI GOVERNANCE VERDICT & POLICY
                </h4>
                <div className="space-y-3 relative z-10">
                    <p className="text-sm lg:text-lg leading-relaxed font-black italic border-l-[6px] border-amber-400/50 pl-6 py-1">
                        "현재 시스템은 <span className="text-amber-300 underline decoration-amber-400/50 underline-offset-4">Gemini 3.0 Flash</span> 모델을 주력으로 사용 중입니다. 유료 결제 시점의 비용 효율성을 극대화 하기 위해 컨텍스트 최적화가 가동중입니다."
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-xl border border-white/10 shadow-xl group hover:bg-white/20 transition-all">
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-[0.1em]">Daily Requests (RPD)</p>
                            <p className="text-lg font-black text-amber-300">1,500 <span className="text-xs opacity-60 text-white font-bold ml-1">Requests / Day</span></p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-xl border border-white/10 shadow-xl group hover:bg-white/20 transition-all">
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-[0.1em]">Tokens Per Min (TPM)</p>
                            <p className="text-lg font-black text-amber-300">1,000,000 <span className="text-xs opacity-60 text-white font-bold ml-1">Tokens / Min</span></p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-xl border border-white/10 shadow-xl group hover:bg-white/20 transition-all">
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-[0.1em]">Requests Per Min (RPM)</p>
                            <p className="text-lg font-black text-amber-300">10 <span className="text-xs opacity-60 text-white font-bold ml-1">Requests / Min</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAiUsageManagement;
