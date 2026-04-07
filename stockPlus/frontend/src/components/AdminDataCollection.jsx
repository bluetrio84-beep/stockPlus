import React, { useState, useEffect } from 'react';
import { Settings, Activity, Database, Clock, RefreshCw, AlertCircle, BarChart3, X, Terminal, List, Table, Filter, TrendingUp, Layers, Briefcase, Award, Brain, Shield, Zap, Lock, Scale } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

const AdminDataCollection = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [aiMode, setAiMode] = useState('BALANCED'); 
    const [dataCategory, setDataCategory] = useState('supply');
    const [config, setConfig] = useState({ collect_interval: 180, ai_strategy_mode: 'BALANCED', collect_on_weekend: 'N', collect_on_holiday: 'Y' });
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState([]);
    const [allData, setAllData] = useState({ supply: [], rank: [], theme: [], industry: [] });
    const [selectedLog, setSelectedLog] = useState(null);

    const formatTimeCompact = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date)) return dateStr;
            const y = String(date.getFullYear()).slice(-2);
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return `${y}.${m}.${d} ${hh}:${mm}`;
        } catch (e) { return dateStr; }
    };

    const fetchData = async () => {
        try {
            const [configRes, logsRes, statsRes, dataRes] = await Promise.all([
                fetch('/api/admin/collector/config', { headers: getAuthHeader() }),
                fetch('/api/admin/collector/logs', { headers: getAuthHeader() }),
                fetch('/api/admin/collector/stats/hourly', { headers: getAuthHeader() }),
                fetch('/api/admin/collector/data/all', { headers: getAuthHeader() })
            ]);
            if (configRes.ok) {
                const conf = await configRes.json();
                // [v18.4 Fix] 서버 데이터(snake_case)를 명시적으로 상태에 저장
                setConfig({
                    ...conf,
                    collect_interval: conf.collect_interval,
                    ai_strategy_mode: conf.ai_strategy_mode,
                    collect_on_weekend: conf.collect_on_weekend || 'N',
                    collect_on_holiday: conf.collect_on_holiday || 'Y'
                });
                setAiMode(conf.ai_strategy_mode || 'BALANCED');
            }
            if (logsRes.ok) setLogs(await logsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
            if (dataRes.ok) setAllData(await dataRes.json());
        } catch (error) {}
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleIntervalChange = async (newVal) => {
        try {
            await fetch('/api/admin/collector/interval', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval: newVal })
            });
            fetchData();
        } catch (e) {}
    };

    const handleStrategyChange = async (newMode) => {
        try {
            setAiMode(newMode);
            await fetch('/api/admin/collector/strategy', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: newMode })
            });
            fetchData();
        } catch (e) {}
    };

    const handlePolicyChange = async (weekend, holiday) => {
        try {
            // [v18.4] UI 즉시 반영 (Optimistic Update)
            setConfig(prev => ({ ...prev, collect_on_weekend: weekend, collect_on_holiday: holiday }));
            
            const res = await fetch('/api/admin/collector/policy', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ collectOnWeekend: weekend, collectOnHoliday: holiday })
            });
            
            if (res.ok) {
                // DB 반영 시간을 위해 500ms 후 최신 데이터 동기화
                setTimeout(fetchData, 500);
            }
        } catch (e) {
            console.error("Policy Change Error:", e);
            fetchData(); // 에러 시 원래 상태로 복구
        }
    };

    const renderDataCard = (item, type) => {
        if (type === 'supply') {
            const parts = item.top_brokers ? item.top_brokers.split(' / ') : ['-', '-'];
            return (
                <div key={item.id} className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl p-4 flex flex-col gap-3 shadow-lg transition-colors">
                    <div className="flex justify-between items-center border-b border-[var(--theme-border)] transition-colors duration-500 pb-2 transition-colors"><span className="text-[var(--theme-text)] font-black text-sm transition-colors">{item.stock_name || '종목'}</span><span className="text-[10px] text-slate-500 font-mono font-bold transition-colors">{formatTimeCompact(item.captured_at)}</span></div>
                    <div className="flex justify-between items-center transition-colors"><span className="text-[11px] text-indigo-600 font-black transition-colors">외국인 순매수(추정)</span><span className={classNames("text-[12px] font-black font-mono transition-colors", parseInt(item.foreign_net_buy || 0) >= 0 ? "text-rose-600" : "text-blue-600")}>{parseInt(item.foreign_net_buy || 0).toLocaleString()}</span></div>
                    <div className="space-y-1.5 mt-1 transition-colors"><div className="text-[10px] text-rose-600 bg-rose-500/10 p-2 rounded border border-rose-500/20 leading-relaxed break-all font-bold transition-colors">{parts[0]}</div><div className="text-[10px] text-emerald-600 bg-emerald-500/10 p-2 rounded border border-emerald-500/20 leading-relaxed break-all font-bold transition-colors">{parts[1] || '-'}</div></div>
                </div>
            );
        }
        if (type === 'rank') {
            return (
                <div key={item.id} className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl p-4 flex flex-col gap-1 transition-colors"><div className="flex justify-between items-center mb-1 transition-colors"><span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-600 text-[9px] font-black rounded border border-cyan-500/20 transition-colors">{item.ranking_type}</span><span className="text-[9px] text-slate-500 font-bold transition-colors">{formatTimeCompact(item.captured_at)}</span></div><div className="flex justify-between items-center transition-colors"><span className="text-[var(--theme-text)] font-black text-xs transition-colors">{item.stock_name || item.stock_code}</span><span className="text-indigo-600 font-black font-mono text-xs transition-colors">{item.rank_value}</span></div></div>
            );
        }
        return (
            <div key={item.id || Math.random()} className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl p-4 transition-colors"><div className="flex justify-between items-center transition-colors"><span className="text-[var(--theme-text)] font-black text-xs truncate max-w-[60%] transition-colors">{item.theme_name || item.industry_name}</span><span className={classNames("text-[11px] font-black font-mono transition-colors", parseFloat(item.change_rate) >= 0 ? "text-rose-600" : "text-blue-600")}>{item.change_rate}%</span></div><span className="text-[9px] text-slate-500 font-bold block text-right mt-1 transition-colors">{formatTimeCompact(item.captured_at)}</span></div>
        );
    };

    return (
        <div className="flex-1 bg-[var(--theme-bg)] transition-colors duration-500 p-4 lg:p-6 overflow-y-auto custom-scrollbar relative h-full flex flex-col font-sans">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div><h1 className="text-2xl font-black text-[var(--theme-text)] flex items-center gap-3 transition-colors"><Settings className="text-[var(--theme-point)]" size={24} /> 데이터 수집 관리</h1><p className="text-slate-500 text-sm mt-1 font-black transition-colors">시스템 통합 수집 제어 및 모니터링</p></div>
                <div className="flex bg-[var(--theme-header)] transition-colors duration-500 p-1 rounded-xl border border-[var(--theme-border)] transition-colors duration-500 self-stretch lg:self-auto shadow-lg overflow-x-auto no-scrollbar">
                    {[
                        { id: 'overview', name: '현황', icon: Activity }, 
                        { id: 'logs', name: '로그', icon: List }, 
                        { id: 'data', name: '데이터', icon: Database },
                        { id: 'next-leaders', name: 'AI 전략', icon: Brain }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={classNames("flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap", activeTab === tab.id ? "bg-[var(--theme-point)] text-white shadow-lg" : "text-slate-500 hover:text-[var(--theme-text)]")}>
                            <tab.icon size={14} /> {tab.name}
                        </button>
                    ))}
                </div>
            </header>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 transition-colors">
                    <div className="col-span-12 lg:col-span-8 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-2xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-6 transition-colors"><h2 className="text-lg font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors"><BarChart3 size={20} className="text-[var(--theme-point)]" /> 수집 현황</h2><div className="text-[10px] font-black bg-[var(--theme-bg)] text-slate-500 px-3 py-1.5 rounded-lg border border-[var(--theme-border)] transition-colors duration-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ACTIVE</div></div>
                        <div className="h-64 transition-colors">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...stats].reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border)" vertical={false} opacity={0.5} />
                                    <XAxis dataKey="hour" stroke="var(--theme-text)" fontSize={10} tick={{fill: 'var(--theme-text)', fontWeight: 'bold'}} tickFormatter={(val) => val.split(' ')[1] + '시'} />
                                    <YAxis stroke="var(--theme-text)" fontSize={10} tick={{fill: 'var(--theme-text)', fontWeight: 'bold'}} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--theme-header)', border: '1px solid var(--theme-border)', borderRadius: '12px', color: 'var(--theme-text)' }} itemStyle={{ color: 'var(--theme-text)', fontWeight: 'bold' }} />
                                    <Bar dataKey="count" fill="var(--theme-point)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="col-span-12 lg:col-span-4 space-y-6 transition-colors">
                        <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-[var(--theme-text)] font-black mb-4 flex items-center gap-2 transition-colors"><Clock className="text-[var(--theme-point)]" size={18}/> 수집 주기: {config.collect_interval}s</h3>
                            <div className="grid grid-cols-2 gap-2 transition-colors">
                                {[{v: 30, l: '30초'}, {v: 60, l: '1분'}, {v: 180, l: '3분'}, {v: 300, l: '5분'}, {v: 420, l: '7분'}, {v: 600, l: '10분'}].map(item => (
                                    <button key={item.v} onClick={() => handleIntervalChange(item.v)} className={classNames("py-3 rounded-xl text-[10px] font-black border transition-all", config.collect_interval === item.v ? "bg-[var(--theme-point)] text-white shadow-lg shadow-[var(--theme-point)]/20 border-transparent" : "bg-[var(--theme-bg)] border-[var(--theme-border)] text-slate-500 hover:text-[var(--theme-text)]")}>{item.l}</button>
                                ))}
                            </div>
                        </div>

                        {/* 가동 정책 설정 (v18.4) */}
                        <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-[var(--theme-text)] font-black mb-4 flex items-center gap-2 transition-colors"><Shield className="text-[var(--theme-point)]" size={18}/> 가동 정책</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-[var(--theme-bg)]/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500">
                                    <span className="text-xs font-black text-slate-500 transition-colors">주말 수집 허용</span>
                                    <div className="flex bg-[var(--theme-header)] transition-colors duration-500 p-1 rounded-lg border border-[var(--theme-border)] transition-colors duration-500 shadow-inner">
                                        <button onClick={() => handlePolicyChange('Y', config.collect_on_holiday)} className={classNames("px-3 py-1 rounded text-[9px] font-black transition-all", config.collect_on_weekend === 'Y' ? "bg-[var(--theme-point)] text-white shadow-md" : "text-slate-500")}>YES</button>
                                        <button onClick={() => handlePolicyChange('N', config.collect_on_holiday)} className={classNames("px-3 py-1 rounded text-[9px] font-black transition-all", config.collect_on_weekend === 'N' ? "bg-rose-600 text-white shadow-md" : "text-slate-500")}>NO</button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-[var(--theme-bg)]/50 p-3 rounded-xl border border-[var(--theme-border)] transition-colors duration-500">
                                    <span className="text-xs font-black text-slate-500 transition-colors">공휴일 수집 허용</span>
                                    <div className="flex bg-[var(--theme-header)] transition-colors duration-500 p-1 rounded-lg border border-[var(--theme-border)] transition-colors duration-500 shadow-inner">
                                        <button onClick={() => handlePolicyChange(config.collect_on_weekend, 'Y')} className={classNames("px-3 py-1 rounded text-[9px] font-black transition-all", config.collect_on_holiday === 'Y' ? "bg-[var(--theme-point)] text-white shadow-md" : "text-slate-500")}>YES</button>
                                        <button onClick={() => handlePolicyChange(config.collect_on_weekend, 'N')} className={classNames("px-3 py-1 rounded text-[9px] font-black transition-all", config.collect_on_holiday === 'N' ? "bg-rose-600 text-white shadow-md" : "text-slate-500")}>NO</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center transition-colors">
                            <RefreshCw className="text-[var(--theme-point)] animate-spin-slow mb-3" size={32} />
                            <p className="text-[var(--theme-point)] font-mono text-xl font-black transition-colors">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="flex-1 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-2xl overflow-hidden flex flex-col animate-in fade-in duration-300 shadow-2xl transition-colors">
                    <div className="p-4 border-b border-[var(--theme-border)] bg-[var(--theme-header)] transition-colors duration-500 transition-colors"><h2 className="text-[var(--theme-text)] font-black flex items-center gap-2 transition-colors"><Terminal size={18} className="text-slate-500"/> 실시간 로그</h2></div>
                    <div className="overflow-auto custom-scrollbar flex-1 font-mono transition-colors"><table className="w-full text-left border-collapse transition-colors"><thead className="bg-[var(--theme-bg)] text-[9px] lg:text-xs text-slate-500 uppercase tracking-tighter sticky top-0 z-10 transition-colors"><tr><th className="px-2 lg:px-4 py-3 w-[95px] lg:w-[160px]">Time</th><th className="px-2 lg:px-4 py-3 w-[45px] lg:w-[80px] text-left">Lv</th><th className="px-2 lg:px-4 py-3">Message</th></tr></thead><tbody className="divide-y divide-[var(--theme-border)]/50 transition-colors">{logs.map((log, i) => (<tr key={i} onClick={() => setSelectedLog(log)} className="hover:bg-[var(--theme-point)]/5 cursor-pointer transition-colors active:bg-[var(--theme-bg)]"><td className="px-2 lg:px-4 py-3 text-[10px] lg:text-sm text-slate-500 font-bold whitespace-nowrap transition-colors">{formatTimeCompact(log.created_at || log.stat_hour)}</td><td className="px-2 lg:px-4 py-3 text-left transition-colors"><span className={classNames("px-1.5 py-0.5 rounded text-[8px] lg:text-[10px] font-black", log.log_level === 'ERROR' ? "bg-rose-500/20 text-rose-600" : "bg-indigo-500/20 text-indigo-600")}>{log.log_level === 'ERROR' ? 'ERR' : 'INF'}</span></td><td className="px-2 lg:px-4 py-3 text-[10px] lg:text-sm text-[var(--theme-text)] font-medium leading-snug break-all transition-colors">{log.message || `Processed cycle.`}</td></tr>))}</tbody></table></div>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300 overflow-hidden"><div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">{[{ id: 'supply', name: '수급/거래원', icon: TrendingUp }, { id: 'theme', name: '테마', icon: Layers }, { id: 'industry', name: '업종', icon: Briefcase }].map(cat => (<button key={cat.id} onClick={() => setDataCategory(cat.id)} className={classNames("px-3 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border flex items-center gap-1.5", dataCategory === cat.id ? "bg-cyan-600 border-cyan-500 text-white" : "bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 text-slate-500")}><cat.icon size={12} /> {cat.name}</button>))}</div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 overflow-y-auto no-scrollbar pb-4 pr-1">{allData[dataCategory]?.map(item => renderDataCard(item, dataCategory))}</div></div>
            )}

            {activeTab === 'next-leaders' && (
                <div className="flex-1 flex flex-col gap-6 animate-in slide-in-from-bottom-2 duration-300 transition-colors">
                    <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-3xl p-6 lg:p-10 shadow-2xl">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 transition-colors">
                            <div><h2 className="text-xl lg:text-2xl font-black text-[var(--theme-text)] flex items-center gap-3 uppercase tracking-tight transition-colors"><Brain className="text-[var(--theme-point)]" size={28} /> AI Analysis Strategy</h2><p className="text-slate-500 text-sm mt-1 font-black transition-colors">분석 민감도 및 모델 가중치 설정</p></div>
                            <div className="flex bg-[var(--theme-bg)] transition-colors duration-500 p-1.5 rounded-2xl border border-[var(--theme-border)] transition-colors duration-500 shadow-inner overflow-x-auto no-scrollbar">
                                <button onClick={() => handleStrategyChange('STABLE')} className={classNames("px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap", aiMode === 'STABLE' ? "bg-[var(--theme-point)] text-white shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 hover:text-[var(--theme-text)]")}><Shield size={14} /> 안정형</button>
                                <button onClick={() => handleStrategyChange('BALANCED')} className={classNames("px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap", aiMode === 'BALANCED' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-slate-500 hover:text-[var(--theme-text)]")}><Zap size={14} /> 기본형</button>
                                <button onClick={() => handleStrategyChange('NEUTRAL')} className={classNames("px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap", aiMode === 'NEUTRAL' ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/20" : "text-slate-500 hover:text-[var(--theme-text)]")}><Scale size={14} /> 중립형</button>
                                <button onClick={() => handleStrategyChange('AGGRESSIVE')} className={classNames("px-6 py-3 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 whitespace-nowrap", aiMode === 'AGGRESSIVE' ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-slate-500 hover:text-[var(--theme-text)]")}><TrendingUp size={14} /> 공격형</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 transition-colors">
                            <div className={classNames("p-5 rounded-2xl border transition-all duration-500", aiMode === 'STABLE' ? "bg-indigo-600/10 border-indigo-500/50 shadow-xl" : "bg-[var(--theme-bg)] transition-colors duration-500/50 border-[var(--theme-border)] transition-colors duration-500 opacity-40 grayscale")}>
                                <div className="flex items-center gap-3 mb-4 transition-colors"><div className="p-2 bg-indigo-500/20 rounded-lg transition-colors"><Shield className="text-indigo-600" size={18} /></div><h3 className="text-[var(--theme-text)] font-black text-sm transition-colors">보수적 분석 (Stable)</h3></div>
                                <ul className="space-y-2.5 text-[11px] font-black text-slate-500 transition-colors">
                                    <li className="flex justify-between transition-colors"><span>가중치</span><span className="text-[var(--theme-text)] transition-colors">Q(0.7) : AI(0.3)</span></li>
                                    <li className="flex justify-between transition-colors"><span>최소점수</span><span className="text-indigo-600 transition-colors">80점 이상</span></li>
                                    <li className="pt-2 border-t border-[var(--theme-border)] transition-colors duration-500/50 text-[10px] text-slate-500 italic font-bold leading-relaxed transition-colors">"확실한 패턴이 완성된 우량주 위주의 선별"</li>
                                </ul>
                            </div>
                            <div className={classNames("p-5 rounded-2xl border transition-all duration-500", aiMode === 'BALANCED' ? "bg-emerald-600/10 border-emerald-500/50 shadow-xl" : "bg-[var(--theme-bg)] transition-colors duration-500/50 border-[var(--theme-border)] transition-colors duration-500 opacity-40 grayscale")}>
                                <div className="flex items-center gap-3 mb-4 transition-colors"><div className="p-2 bg-emerald-500/20 rounded-lg transition-colors"><Zap className="text-emerald-600" size={18} /></div><h3 className="text-[var(--theme-text)] font-black text-sm transition-colors">균형 분석 (Balanced)</h3></div>
                                <ul className="space-y-2.5 text-[11px] font-black text-slate-500 transition-colors">
                                    <li className="flex justify-between transition-colors"><span>가중치</span><span className="text-[var(--theme-text)] transition-colors">Q(0.6) : AI(0.4)</span></li>
                                    <li className="flex justify-between transition-colors"><span>최소점수</span><span className="text-emerald-600 transition-colors">65점 이상</span></li>
                                    <li className="pt-2 border-t border-[var(--theme-border)] transition-colors duration-500/50 text-[10px] text-slate-500 italic font-bold leading-relaxed transition-colors">"알고리즘과 AI의 조화로운 중단기 분석"</li>
                                </ul>
                            </div>
                            <div className={classNames("p-5 rounded-2xl border transition-all duration-500", aiMode === 'NEUTRAL' ? "bg-cyan-600/10 border-cyan-500/50 shadow-xl" : "bg-[var(--theme-bg)] transition-colors duration-500/50 border-[var(--theme-border)] transition-colors duration-500 opacity-40 grayscale")}>
                                <div className="flex items-center gap-3 mb-4 transition-colors"><div className="p-2 bg-cyan-500/20 rounded-lg transition-colors"><Scale className="text-cyan-600" size={18} /></div><h3 className="text-[var(--theme-text)] font-black text-sm transition-colors">중립형 (Neutral)</h3></div>
                                <ul className="space-y-2.5 text-[11px] font-black text-slate-500 transition-colors">
                                    <li className="flex justify-between transition-colors"><span>가중치</span><span className="text-[var(--theme-text)] transition-colors">Q(0.5) : AI(0.5)</span></li>
                                    <li className="flex justify-between transition-colors"><span>최소점수</span><span className="text-cyan-600 transition-colors">60점 이상</span></li>
                                    <li className="pt-2 border-t border-[var(--theme-border)] transition-colors duration-500/50 text-[10px] text-slate-500 italic font-bold leading-relaxed transition-colors">"데이터의 완벽한 수평 균형"</li>
                                </ul>
                            </div>
                            <div className={classNames("p-5 rounded-2xl border transition-all duration-500", aiMode === 'AGGRESSIVE' ? "bg-rose-600/10 border-rose-500/50 shadow-xl" : "bg-[var(--theme-bg)] transition-colors duration-500/50 border-[var(--theme-border)] transition-colors duration-500 opacity-40 grayscale")}>
                                <div className="flex items-center gap-3 mb-4 transition-colors"><div className="p-2 bg-rose-500/20 rounded-lg transition-colors"><TrendingUp className="text-rose-600" size={18} /></div><h3 className="text-[var(--theme-text)] font-black text-sm transition-colors">기회 포착 (Aggressive)</h3></div>
                                <ul className="space-y-2.5 text-[11px] font-black text-slate-500 transition-colors">
                                    <li className="flex justify-between transition-colors"><span>가중치</span><span className="text-[var(--theme-text)] transition-colors">Q(0.4) : AI(0.6)</span></li>
                                    <li className="flex justify-between transition-colors"><span>최소점수</span><span className="text-rose-600 transition-colors">55점 이상</span></li>
                                    <li className="pt-2 border-t border-[var(--theme-border)] transition-colors duration-500/50 text-[10px] text-slate-500 italic font-bold leading-relaxed transition-colors">"미세한 수급 변화까지 감지하여 기회 극대화"</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-10 p-6 bg-[var(--theme-bg)] transition-colors duration-500 rounded-2xl border border-[var(--theme-border)] transition-colors duration-500 flex items-start gap-4 transition-colors shadow-inner"><AlertCircle className="text-amber-600 shrink-0 mt-1" size={20} /><div><h4 className="text-amber-600 font-black text-xs uppercase tracking-widest mb-1 transition-colors">Notice</h4><p className="text-[var(--theme-text)] opacity-70 text-[11px] font-black leading-relaxed transition-colors">전략 변경 시 다음 분석 사이클부터 즉시 반영됩니다.</p></div></div>
                    </div>
                </div>
            )}

            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-colors">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
                    <div className="relative w-full max-w-lg bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-colors">
                        <div className="p-4 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500 flex justify-between items-center text-[var(--theme-text)] transition-colors">
                            <h3 className="font-black text-sm transition-colors">Log Detail View</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-[var(--theme-bg)] rounded-full transition-colors"><X size={18}/></button>
                        </div>
                        <div className="p-6 bg-[var(--theme-bg)] transition-colors duration-500 font-mono text-[11px] text-[var(--theme-text)] opacity-90 overflow-y-auto max-h-[50vh] leading-relaxed whitespace-pre-wrap transition-colors">
                            {selectedLog.message || `No message content.`}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDataCollection;
