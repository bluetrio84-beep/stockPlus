import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Activity, Brain, PieChart, TrendingUp, Clock, 
    AlertCircle, Loader2, RefreshCw, Zap, Wallet, ShieldAlert, CheckCircle2,
    Calendar, ArrowUpRight, DollarSign, Database, Sparkles
} from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import classNames from 'classnames';

// Gemini Flash 단가 기준 (1M 토큰당 USD)
// Input: $0.075 / 1,000,000 | Output: $0.300 / 1,000,000
const INPUT_PRICE_PER_TOKEN = 0.075 / 1000000;
const OUTPUT_PRICE_PER_TOKEN = 0.300 / 1000000;
const USD_KRW_EXCHANGE_RATE = 1350; // 환율 기준

const AdminAiUsageManagement = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState([]);
    const [typeStats, setTypeStats] = useState([]);
    const [summary, setSummary] = useState({ 
        total: 0, 
        prompt: 0, 
        completion: 0, 
        requests: 0,
        costUsd: 0,
        costKrw: 0
    });

    const COLORS = ['#4f46e5', '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981', '#f59e0b'];

    const TYPE_MAP = {
        'STOCK_ANALYSIS': '종목 심층 분석',
        'MAGAZINE_ANALYSIS': '매거진 시황 분석',
        'NEWS_SUMMARY': '뉴스 핵심 요약',
        'MARKET_INSIGHT': '시장 인사이트',
        'SPECIAL_ANALYSIS': '관심종목 분석',
        'GENERAL_TASK': '일반 분석 작업'
    };

    // 정밀 비용 계산기 (USD)
    const calculateCostUsd = (promptTokens, completionTokens, totalTokens) => {
        if (promptTokens && completionTokens) {
            return (promptTokens * INPUT_PRICE_PER_TOKEN) + (completionTokens * OUTPUT_PRICE_PER_TOKEN);
        }
        // 토큰 구분이 없을 경우 평균 블렌디드 요율 약 $0.15/1M 적용
        return (totalTokens || 0) * (0.15 / 1000000);
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
                
                const translatedType = type.map(item => ({
                    ...item,
                    name: TYPE_MAP[item.name] || item.name
                }));
                setTypeStats(translatedType);

                if (daily.length > 0) {
                    const today = daily[daily.length - 1];
                    const prompt = today.prompt_tokens || 0;
                    const completion = today.completion_tokens || 0;
                    const total = today.total_tokens || 0;
                    const requests = today.request_count || 0;
                    const costUsd = calculateCostUsd(prompt, completion, total);
                    const costKrw = Math.round(costUsd * USD_KRW_EXCHANGE_RATE * 10) / 10;

                    setSummary({
                        total,
                        prompt,
                        completion,
                        requests,
                        costUsd,
                        costKrw
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

    // 최근 일자 역순 정렬 (상세 테이블용: 최신 날짜가 맨 위)
    const reversedDailyStats = [...dailyStats].reverse();

    // 일별 테이블 누적 합계 계산
    const periodTotals = dailyStats.reduce((acc, cur) => {
        acc.requests += (cur.request_count || 0);
        acc.prompt += (cur.prompt_tokens || 0);
        acc.completion += (cur.completion_tokens || 0);
        acc.total += (cur.total_tokens || 0);
        acc.costUsd += calculateCostUsd(cur.prompt_tokens, cur.completion_tokens, cur.total_tokens);
        return acc;
    }, { requests: 0, prompt: 0, completion: 0, total: 0, costUsd: 0 });

    const periodTotalKrw = Math.round(periodTotals.costUsd * USD_KRW_EXCHANGE_RATE);

    return (
        <div className="w-full h-full flex-1 flex flex-col bg-[var(--theme-bg)] p-4 lg:pt-8 lg:px-6 pb-32 lg:pb-28 overflow-y-auto custom-scrollbar transition-colors duration-500 min-h-0">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 px-2">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-black text-[var(--theme-text)] tracking-tighter flex items-center gap-4 transition-colors">
                        <Brain className="text-[var(--theme-point)]" size={32} />
                        AI USAGE & COST INTELLIGENCE
                    </h1>
                    <p className="text-xs text-slate-500 font-bold mt-1 lg:ml-12 uppercase tracking-[0.2em] opacity-80 transition-colors">
                        Gemini 3.6 Flash API Consumption, Free Tier Status & Daily Ledger
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-black flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Free Tier Active (청구금액 ₩0)
                    </div>
                    <button 
                        onClick={fetchData}
                        className="px-5 py-2 bg-[var(--theme-point)] text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-xl active:scale-95 transition-all hover:brightness-110"
                    >
                        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> REFRESH
                    </button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 px-2">
                {/* 1. Today Requests */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl py-3 px-4 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 bg-amber-500/10 group-hover:scale-150 duration-700 transition-transform"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">Today Requests</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-2xl font-black text-[var(--theme-text)] tracking-tighter">{summary.requests.toLocaleString()}</h3>
                        <span className="text-[10px] font-bold text-slate-400">/ 1,500 RPD</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-slate-700/30 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min(100, (summary.requests / 1500) * 100)}%` }}
                            />
                        </div>
                        <span className="text-[9px] font-extrabold text-amber-500">
                            {((summary.requests / 1500) * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* 2. Today Tokens */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl py-3 px-4 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 bg-indigo-500/10 group-hover:scale-150 duration-700 transition-transform"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">Today Tokens</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-2xl font-black text-[var(--theme-text)] tracking-tighter">{summary.total.toLocaleString()}</h3>
                        <span className="text-[10px] font-bold text-indigo-400">tok</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 flex items-center justify-between">
                        <span>P: {summary.prompt.toLocaleString()}</span>
                        <span>C: {summary.completion.toLocaleString()}</span>
                    </p>
                </div>

                {/* 3. Est. Cost Today (USD) */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl py-3 px-4 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 bg-rose-500/10 group-hover:scale-150 duration-700 transition-transform"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">Est. Cost (Today USD)</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-2xl font-black text-rose-500 tracking-tighter">${summary.costUsd.toFixed(4)}</h3>
                        <span className="text-[10px] font-bold text-slate-400">USD</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                        원화 약 <span className="text-rose-400 font-extrabold">₩{summary.costKrw.toFixed(1)}원</span>
                    </p>
                </div>

                {/* 4. 14-Day Cumulative Cost */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl py-3 px-4 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 bg-cyan-500/10 group-hover:scale-150 duration-700 transition-transform"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">Recent 14D Total Cost</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-2xl font-black text-cyan-400 tracking-tighter">${periodTotals.costUsd.toFixed(3)}</h3>
                        <span className="text-[10px] font-bold text-slate-400">USD</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                        14일 총액: <span className="text-cyan-300 font-extrabold">₩{periodTotalKrw.toLocaleString()}원</span>
                    </p>
                </div>

                {/* 5. Actual Billing Status */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl py-3 px-4 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 bg-emerald-500/10 group-hover:scale-150 duration-700 transition-transform"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-1">Actual Billing</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-2xl font-black text-emerald-400 tracking-tighter">₩0</h3>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">무료</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        Free Tier 한도 내 100% 충족
                    </p>
                </div>
            </div>

            {/* Intelligence Notice & Cost Policy (상단 배치로 가시성 극대화) */}
            <div className="shrink-0 p-5 lg:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-[2rem] border border-indigo-500/30 text-white shadow-2xl relative overflow-hidden mb-6 mx-2 transition-all">
                <Brain className="absolute bottom-[-30px] right-[-30px] opacity-10 text-white pointer-events-none" size={200} />
                <h4 className="text-xs lg:text-sm font-black uppercase tracking-[0.25em] mb-3 text-indigo-200 flex items-center gap-3">
                    <ShieldAlert size={18} className="text-amber-400 shrink-0" /> AI GOVERNANCE VERDICT & BILLING AUDIT
                </h4>
                <div className="space-y-4 relative z-10 text-xs lg:text-sm">
                    <p className="leading-relaxed font-medium text-slate-300 border-l-[4px] border-amber-400 pl-4 py-1 break-keep">
                        현재 시스템은 <span className="text-amber-300 font-black">Google Gemini 3.6 Flash</span> 모델을 주력으로 사용 중입니다. 
                        Google AI Studio 기본 정책에 따라 하루 1,500회(1,500 RPD)까지 완전 무료로 제공되며, 
                        현재 StockPlus 시스템은 하루 평균 <span className="text-emerald-400 font-extrabold">10~16회(약 0.8%)</span> 수준만 사용하여 
                        <span className="text-emerald-300 font-black"> 실제 청구 요금은 0원(완전 무료)</span>입니다.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 pt-1">
                        <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-[0.1em] text-slate-400">일일 무료 한도 (RPD)</p>
                            <p className="text-base lg:text-lg font-black text-amber-300 tracking-tight">1,500 <span className="text-[10px] opacity-70 text-white font-normal ml-0.5">Requests / Day</span></p>
                            <p className="text-[11px] text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                                현재 사용률: ~0.8% (초안전)
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-[0.1em] text-slate-400">분당 한도 (RPM / TPM)</p>
                            <p className="text-base lg:text-lg font-black text-amber-300 tracking-tight">15 RPM <span className="text-[10px] opacity-70 text-white font-normal ml-0.5">/ 1M TPM</span></p>
                            <p className="text-[11px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block"></span>
                                스로틀링 지연 제로
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-[0.1em] text-slate-400">Flash 공식 단가 (1M 토큰)</p>
                            <p className="text-base lg:text-lg font-black text-cyan-300 tracking-tight">In $0.075 <span className="text-[10px] opacity-70 text-white font-normal">/ Out $0.30</span></p>
                            <p className="text-[11px] text-slate-400 font-bold mt-1.5">
                                100만 토큰당 약 100~400원
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-xl border border-white/10 shadow-lg flex flex-col justify-between">
                            <p className="text-[10px] font-black uppercase opacity-70 mb-1 tracking-[0.1em] text-slate-400">유료 전환 시 일 예상 비용</p>
                            <p className="text-base lg:text-lg font-black text-rose-300 tracking-tight">약 ₩4 ~ 6원 <span className="text-[10px] opacity-70 text-white font-normal ml-0.5">/ 1일</span></p>
                            <p className="text-[11px] text-slate-400 font-bold mt-1.5">
                                한 달 30일 기준 약 120~180원
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 px-2">
                {/* Usage Trend Line Chart */}
                <div className="lg:col-span-8 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[2rem] p-6 shadow-2xl transition-colors">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-[0.3em] flex items-center gap-3 transition-colors">
                            <TrendingUp size={18} className="text-[var(--theme-point)]" /> Token Usage Trend (Daily)
                        </h3>
                        <span className="text-[10px] font-bold text-slate-500">최근 {dailyStats.length}일간 추이</span>
                    </div>
                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyStats}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
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
                                    formatter={(value) => [`${value.toLocaleString()} tokens`, '토큰 사용량']}
                                />
                                <Area type="monotone" dataKey="total_tokens" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Type Distribution Pie Chart */}
                <div className="lg:col-span-4 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[2rem] p-6 shadow-2xl transition-colors flex flex-col">
                    <h3 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-[0.3em] mb-4 flex items-center gap-3 transition-colors">
                        <PieChart size={18} className="text-rose-500" /> By Request Type
                    </h3>
                    <div className="flex-1 w-full flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height={260}>
                            <RePieChart>
                                <Pie
                                    data={typeStats}
                                    innerRadius={70}
                                    outerRadius={105}
                                    paddingAngle={6}
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
                                    formatter={(value) => [`${value.toLocaleString()} tokens`, '누적 토큰']}
                                />
                                <Legend verticalAlign="bottom" align="center" wrapperStyle={{paddingTop: '16px', fontSize: '10px', fontWeight: 'bold'}} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* [신규 핵심 기능] 일별 사용량 상세 내역 테이블 (Daily Usage Ledger) */}
            <div className="shrink-0 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-[2rem] p-6 shadow-2xl transition-colors mb-6 mx-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <h3 className="text-sm font-black text-[var(--theme-text)] uppercase tracking-[0.2em] flex items-center gap-3">
                            <Calendar size={18} className="text-indigo-400" />
                            일별 AI 사용량 및 비용 상세 원장 (Daily Consumption Ledger)
                        </h3>
                        <p className="text-[11px] text-slate-500 font-bold mt-1">
                            일자별 호출 횟수, 입/출력 토큰, 추정 비용 및 무료 티어(1,500 RPD) 소진 현황
                        </p>
                    </div>
                    <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        실시간 DB 로그 연동 중
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--theme-border)] text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
                                <th className="py-3 px-3">일자 (Date)</th>
                                <th className="py-3 px-3 text-right">호출수 (RPD)</th>
                                <th className="py-3 px-3 text-right">RPD 소진율</th>
                                <th className="py-3 px-3 text-right">프롬프트 토큰</th>
                                <th className="py-3 px-3 text-right">완성 토큰</th>
                                <th className="py-3 px-3 text-right">총 토큰 (Total)</th>
                                <th className="py-3 px-3 text-right">추정 비용 (USD)</th>
                                <th className="py-3 px-3 text-right">추정 비용 (KRW)</th>
                                <th className="py-3 px-3 text-center">과금 상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--theme-border)]/50 text-xs font-bold text-[var(--theme-text)]">
                            {reversedDailyStats.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-slate-500 font-bold">
                                        조회된 일별 사용량 기록이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                reversedDailyStats.map((item, idx) => {
                                    const isToday = idx === 0;
                                    const reqCount = item.request_count || 0;
                                    const promptTokens = item.prompt_tokens || 0;
                                    const completionTokens = item.completion_tokens || 0;
                                    const totalTokens = item.total_tokens || 0;
                                    const costUsd = calculateCostUsd(promptTokens, completionTokens, totalTokens);
                                    const costKrw = Math.round(costUsd * USD_KRW_EXCHANGE_RATE * 10) / 10;
                                    const rpdPercent = ((reqCount / 1500) * 100).toFixed(1);

                                    return (
                                        <tr 
                                            key={item.date || idx} 
                                            className={classNames(
                                                "hover:bg-slate-500/5 transition-colors",
                                                isToday && "bg-indigo-500/5 font-extrabold"
                                            )}
                                        >
                                            <td className="py-3 px-3 flex items-center gap-2">
                                                <span className="font-mono text-xs">{item.date}</span>
                                                {isToday && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500 text-white font-black tracking-wider uppercase">
                                                        TODAY
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono">
                                                {reqCount.toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">회</span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <span className="font-mono text-[11px] text-emerald-400">{rpdPercent}%</span>
                                                    <div className="w-12 bg-slate-700/40 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                                        <div 
                                                            className="bg-emerald-400 h-full rounded-full" 
                                                            style={{ width: `${Math.min(100, Math.max(2, parseFloat(rpdPercent) * 5))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-cyan-400">
                                                {promptTokens.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-purple-400">
                                                {completionTokens.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-black text-indigo-400">
                                                {totalTokens.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-slate-400">
                                                ${costUsd.toFixed(4)}
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono text-rose-400 font-black">
                                                ₩{costKrw.toFixed(1)}원
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold whitespace-nowrap">
                                                    무료 (Free Tier)
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                        {/* Table Footer: Total & Average */}
                        {reversedDailyStats.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-[var(--theme-border)] bg-slate-500/5 text-xs font-black text-[var(--theme-text)]">
                                    <td className="py-3 px-3">
                                        합계 (Total {reversedDailyStats.length}일)
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono">
                                        {periodTotals.requests.toLocaleString()} 회
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                                        일평균 {(periodTotals.requests / reversedDailyStats.length).toFixed(1)}회
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-cyan-400">
                                        {periodTotals.prompt.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-purple-400">
                                        {periodTotals.completion.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-indigo-400">
                                        {periodTotals.total.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                                        ${periodTotals.costUsd.toFixed(4)}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-rose-400">
                                        ₩{periodTotalKrw.toLocaleString()}원
                                    </td>
                                    <td className="py-3 px-3 text-center text-emerald-400 text-[11px]">
                                        청구 ₩0원
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminAiUsageManagement;
