import React, { useState, useEffect } from 'react';
import { Settings, Activity, Database, Clock, RefreshCw, AlertCircle, BarChart3, X, Terminal, List, Table, Filter, TrendingUp, Layers, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [dataCategory, setDataCategory] = useState('supply');
    const [config, setConfig] = useState({ collect_interval: 180 });
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState([]);
    const [allData, setAllData] = useState({ supply: [], rank: [], theme: [], industry: [] });
    const [selectedLog, setSelectedLog] = useState(null);

    // [개선] 초정밀 콤팩트 시간 포맷 (26.02.20 19:59)
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
                fetch('/stockPlus/api/admin/collector/config', { headers: getAuthHeader() }),
                fetch('/stockPlus/api/admin/collector/logs', { headers: getAuthHeader() }),
                fetch('/stockPlus/api/admin/collector/stats/hourly', { headers: getAuthHeader() }),
                fetch('/stockPlus/api/admin/collector/data/all', { headers: getAuthHeader() })
            ]);
            if (configRes.ok) setConfig(await configRes.json());
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
            await fetch('/stockPlus/api/admin/collector/interval', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval: newVal })
            });
            fetchData();
        } catch (e) {}
    };

    const renderDataCard = (item, type) => {
        if (type === 'supply') {
            return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-white font-bold text-sm">{item.stock_name || '종목'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{formatTimeCompact(item.captured_at)}</span>
                    </div>
                    <div className="text-[11px] text-indigo-400 font-black">외국계합: {parseInt(item.foreign_net_buy || 0).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 truncate bg-slate-950/50 p-2 rounded border border-slate-800/50">{item.top_brokers || '-'}</div>
                </div>
            );
        }
        if (type === 'rank') {
            return (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 text-[9px] font-black rounded border border-cyan-500/20">{item.ranking_type}</span>
                        <span className="text-[9px] text-slate-500">{formatTimeCompact(item.captured_at)}</span>
                    </div>
                    <div className="flex justify-between items-center"><span className="text-white font-bold text-xs">{item.stock_name || item.stock_code}</span><span className="text-indigo-400 font-black font-mono text-xs">{item.rank_value}</span></div>
                </div>
            );
        }
        return (
            <div key={item.id || Math.random()} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-xs truncate max-w-[60%]">{item.theme_name || item.industry_name}</span>
                    <span className={classNames("text-[11px] font-black font-mono", parseFloat(item.change_rate) >= 0 ? "text-rose-400" : "text-blue-400")}>{item.change_rate}%</span>
                </div>
                <span className="text-[9px] text-slate-500 block text-right mt-1">{formatTimeCompact(item.captured_at)}</span>
            </div>
        );
    };

    return (
        <div className="flex-1 bg-slate-950 p-4 lg:p-6 overflow-y-auto custom-scrollbar relative h-full flex flex-col">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div><h1 className="text-2xl font-black text-white flex items-center gap-3"><Settings className="text-indigo-500" /> 시스템 관리</h1><p className="text-slate-500 text-sm mt-1 font-medium">데이터 수집 모니터링</p></div>
                <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-stretch lg:self-auto shadow-lg">
                    {[{ id: 'overview', name: '현황', icon: Activity }, { id: 'logs', name: '로그', icon: List }, { id: 'data', name: '데이터', icon: Database }].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={classNames("flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2", activeTab === tab.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}><tab.icon size={14} /> {tab.name}</button>
                    ))}
                </div>
            </header>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-white flex items-center gap-2"><BarChart3 size={20} className="text-indigo-400" /> 수집 현황</h2><div className="text-[10px] font-black bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ACTIVE</div></div>
                        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...stats].reverse()}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.split(' ')[1] + '시'} /><YAxis stroke="#64748b" fontSize={10} /><Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} /><Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                    </div>
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"><h3 className="text-white font-bold mb-4 flex items-center gap-2"><Clock className="text-indigo-400" size={18}/> 주기: {config.collect_interval}s</h3><div className="grid grid-cols-2 gap-2">{[60, 180, 300, 600].map(v => (<button key={v} onClick={() => handleIntervalChange(v)} className={classNames("py-3 rounded-xl text-[10px] font-black border transition-all", config.collect_interval === v ? "bg-indigo-600/20 border-indigo-500 text-indigo-400" : "bg-slate-800/50 border-slate-700 text-slate-500")}>{v / 60}분</button>))}</div></div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center"><RefreshCw className="text-indigo-400 animate-spin-slow mb-3" size={32} /><p className="text-indigo-400 font-mono text-xl font-black">{new Date().toLocaleTimeString()}</p></div>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col animate-in fade-in duration-300 shadow-2xl">
                    <div className="p-4 border-b border-slate-800 bg-slate-850"><h2 className="text-white font-bold flex items-center gap-2"><Terminal size={18} className="text-slate-400"/> 실시간 로그</h2></div>
                    <div className="overflow-auto custom-scrollbar flex-1 font-mono">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-950/50 text-[9px] lg:text-xs text-slate-500 uppercase tracking-tighter sticky top-0 z-10">
                                <tr>
                                    <th className="px-2 lg:px-4 py-3 w-[95px] lg:w-[160px]">Time</th>
                                    <th className="px-2 lg:px-4 py-3 w-[45px] lg:w-[80px] text-left">Lv</th>
                                    <th className="px-2 lg:px-4 py-3">Message</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {logs.map((log, i) => (
                                    <tr key={i} onClick={() => setSelectedLog(log)} className="hover:bg-slate-800/50 cursor-pointer transition-colors active:bg-slate-700">
                                        <td className="px-2 lg:px-4 py-3 text-[10px] lg:text-sm text-slate-400 font-bold whitespace-nowrap">{formatTimeCompact(log.created_at || log.stat_hour)}</td>
                                        <td className="px-2 lg:px-4 py-3 text-left">
                                            <span className={classNames("px-1.5 py-0.5 rounded text-[8px] lg:text-[10px] font-black", log.log_level === 'ERROR' ? "bg-red-500/20 text-red-400" : "bg-indigo-500/20 text-indigo-400")}>
                                                {log.log_level === 'ERROR' ? 'ERR' : 'INF'}
                                            </span>
                                        </td>
                                        <td className="px-2 lg:px-4 py-3 text-[10px] lg:text-sm text-slate-300 leading-snug break-all">{log.message || `Processed cycle.`}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-300 overflow-hidden">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {[{ id: 'supply', name: '수급/거래원', icon: TrendingUp }, { id: 'rank', name: '랭킹', icon: Activity }, { id: 'theme', name: '테마', icon: Layers }, { id: 'industry', name: '업종', icon: Briefcase }].map(cat => (
                            <button key={cat.id} onClick={() => setDataCategory(cat.id)} className={classNames("px-3 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border flex items-center gap-1.5", dataCategory === cat.id ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-900 border-slate-800 text-slate-500")}><cat.icon size={12} /> {cat.name}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 overflow-y-auto no-scrollbar pb-4 pr-1">
                        {allData[dataCategory]?.map(item => renderDataCard(item, dataCategory))}
                    </div>
                </div>
            )}

            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
                    <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-800 bg-slate-850 flex justify-between items-center text-white"><h3 className="font-bold text-sm">Log Detail</h3><button onClick={() => setSelectedLog(null)}><X size={18}/></button></div>
                        <div className="p-6 bg-slate-950 font-mono text-[11px] text-slate-200 overflow-y-auto max-h-[50vh] leading-relaxed whitespace-pre-wrap">{selectedLog.message || `No message content.`}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
