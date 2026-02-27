import React, { useState, useEffect } from 'react';
import { getAuthHeader } from '../api/stockApi';
import { Calendar, Download, TrendingUp, Loader2, Award, X } from 'lucide-react';
import classNames from 'classnames';

const NextLeaderDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [nextLeaders, setNextLeaders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchNextLeaders = async (date) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/stockPlus/api/admin/intelligence/next-leaders?date=${date}`, {
                headers: getAuthHeader()
            });
            if (res.ok) {
                const json = await res.json();
                setNextLeaders(json);
            }
        } catch (e) {
            console.error("Fetch Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNextLeaders(selectedDate);
    }, [selectedDate]);

    const downloadExcel = () => {
        if (nextLeaders.length === 0) return;
        const script = document.createElement("script");
        script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
        script.onload = () => {
            const XLSX = window.XLSX;
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const d = new Date(dateStr);
                const pad = (n) => n.toString().padStart(2, '0');
                return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };
            const excelData = nextLeaders.map((item, idx) => ({
                "순위": idx + 1,
                "종목명": item.stock_name,
                "종목코드": item.stock_code,
                "총점": parseFloat(item.total_score.toFixed(1)),
                "알고리즘": parseFloat(item.algo_score.toFixed(1)),
                "AI앙상블": parseFloat(item.ensemble_score.toFixed(1)),
                "선발사유": item.reason,
                "분석시간": formatDate(item.captured_at)
            }));
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 50 }, { wch: 20 }];
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                const cell = worksheet[XLSX.utils.encode_cell({r:R, c:2})];
                if (cell) cell.t = 's';
            }
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "NextLeaders");
            XLSX.writeFile(workbook, `StockPlus_NextLeaders_${selectedDate.replace(/-/g, '')}.xlsx`);
        };
        document.head.appendChild(script);
    };

    return (
        <div className="flex-1 bg-slate-950 pt-2 px-1 lg:pt-6 lg:px-6 h-[100dvh] lg:h-full flex flex-col gap-2 lg:gap-4 overflow-hidden relative pb-0 lg:pb-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 px-1">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 lg:p-2 bg-indigo-600/20 rounded-xl border border-indigo-500/30">
                        <Award className="text-indigo-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-base lg:text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-1.5">
                            Next Leaders <span className="text-indigo-500 not-italic font-sans">AI</span>
                        </h1>
                        <p className="text-slate-500 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest mt-0.5">Daily Turn-around Briefing</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 w-full lg:w-auto pr-1">
                    <div className="relative w-[130px] lg:w-[160px] shrink-0">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                            className="w-full bg-slate-900 border border-slate-700 text-white text-[11px] lg:text-sm rounded-xl pl-8 pr-1 py-1.5 lg:py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer font-bold tracking-tighter" 
                        />
                    </div>
                    <button 
                        onClick={downloadExcel} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 lg:py-2.5 rounded-xl font-black text-[10px] lg:text-sm flex items-center gap-1 shadow-lg transition-all shrink-0"
                    >
                        <Download size={14} /> EXCEL
                    </button>
                </div>
            </header>

            <div className="flex-1 min-h-0 bg-slate-900/50 border border-slate-800 rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm flex flex-col mx-0.5 lg:mx-0">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
                    <h3 className="text-white text-xs lg:text-base font-black flex items-center gap-1.5 uppercase tracking-tighter">
                        <TrendingUp className="text-rose-500" size={16} /> 바닥 탈출 Top 20
                    </h3>
                    <span className="text-[9px] text-slate-500 font-mono italic">1,600 Stocks Analysis</span>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="sticky top-0 z-10 bg-slate-900 shadow-sm">
                            <tr>
                                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900">Rank</th>
                                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 w-32 lg:w-40">Stock</th>
                                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center bg-slate-900">Score</th>
                                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900">Breakdown</th>
                                <th className="px-4 lg:px-6 py-3 lg:py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[180px] bg-slate-900">Reason</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {isLoading ? (
                                <tr><td colSpan="5" className="py-20 text-center"><Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-slate-500 text-[10px] font-bold uppercase animate-pulse">Analyzing...</p></td></tr>
                            ) : nextLeaders.length > 0 ? (
                                <>{nextLeaders.map((item, idx) => (
                                    <tr key={item.id} className="group hover:bg-indigo-600/5 transition-colors">
                                        <td className="px-4 lg:px-6 py-1.5 lg:py-2">
                                            <div className={classNames(
                                                "w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center font-black text-xs lg:text-sm shadow-inner",
                                                idx < 3 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                                            )}>{idx + 1}</div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-1.5 lg:py-2 w-32 lg:w-40">
                                            <div className="flex flex-col"><span className="text-white font-black text-sm lg:text-base group-hover:text-indigo-400 transition-colors truncate">{item.stock_name}</span><span className="text-slate-500 font-mono text-[10px]">{item.stock_code}</span></div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-1.5 lg:py-2 text-center">
                                            <div className="inline-block px-3 py-1 bg-slate-800 rounded-full border border-slate-700"><span className="text-indigo-400 font-black text-sm lg:text-base">{item.total_score.toFixed(1)}</span></div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-1.5 lg:py-2">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col gap-0.5 w-16 lg:w-24">
                                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase"><span>Algo</span><span>{item.algo_score.toFixed(0)}</span></div>
                                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{width: `${item.algo_score}%`}}></div></div>
                                                </div>
                                                <div className="flex flex-col gap-0.5 w-16 lg:w-24">
                                                    <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase"><span>AI</span><span>{item.ensemble_score.toFixed(0)}</span></div>
                                                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{width: `${item.ensemble_score}%`}}></div></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-1.5 lg:py-2">
                                            <div className="flex flex-wrap gap-1">
                                                {item.reason.split(',').map((r, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] lg:text-[11px] font-bold rounded border border-slate-700/50">{r.trim()}</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}<tr className="h-4"><td></td></tr></>
                            ) : (
                                <tr><td colSpan="5" className="py-20 text-center text-slate-600 font-bold italic text-xs uppercase tracking-widest">No Data Available</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default NextLeaderDashboard;
