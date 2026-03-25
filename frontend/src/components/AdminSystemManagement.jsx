import React, { useState, useEffect } from 'react';
import { Settings, Users, Box, Search, Plus, Edit2, Trash2, X, Save, Loader2, AlertTriangle, ChevronLeft, ChevronRight, AlertCircle, Filter, Calendar, UserCheck, UserX, Shield, UserPlus, Key, Link, Globe, Wallet, BarChart3, ChevronDown, Database } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

const AdminSystemManagement = () => {
    const [activeTab, setActiveTab] = useState('stocks'); 
    const [stocks, setStocks] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [userSearchKeyword, setUserSearchKeyword] = useState('');
    const [marketFilter, setMarketFilter] = useState('ALL');
    const [totalStockCount, setTotalStockCount] = useState(0); 
    const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
    
    const isMobile = window.innerWidth < 1024;
    const pageSize = isMobile ? 10 : 50;
    const [page, setPage] = useState(0);

    // 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false); 
    const [isUserModalOpen, setIsUserModalOpen] = useState(false); 
    const [errorPopup, setErrorPopup] = useState(null);

    // 폼 데이터
    const [editingStock, setEditingStock] = useState(null);
    const [formData, setFormData] = useState({ stockCode: '', stockName: '', exchangeCode: 'J', marketType: 'KOSPI' });
    
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [holidayFormData, setHolidayFormData] = useState({ holiday_date: '', holiday_name: '', holiday_year: new Date().getFullYear() });

    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({ usrId: '', usrName: '', email: '', phoneNumber: '', role: 'USER', useyn: 'Y', password: '' });

    // 삭제 확인 타겟
    const [deleteTarget, setDeleteConfirm] = useState(null); 
    const [deleteHolidayTarget, setDeleteHolidayConfirm] = useState(null);
    const [deleteUserTarget, setDeleteUserConfirm] = useState(null);

    // [v30.36] API 스캔 전용 상태 (기존 로직 100% 보존)
    const [gitUrl, setGitUrl] = useState('https://github.com/bluetrio84-beep/stockPlus.git');
    const [scannedData, setScannedData] = useState(null);
    const [expandedApi, setExpandedApi] = useState(null);
    const [expandedTable, setExpandedTable] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('apis');

    const fetchStocks = async (p = 0) => {
        try {
            setIsLoading(true);
            const offset = p * pageSize;
            const res = await fetch(`/api/admin/stocks?limit=${pageSize}&offset=${offset}&marketType=${marketFilter}`, { headers: getAuthHeader() });
            if (res.ok) { setStocks(await res.json()); setPage(p); }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const fetchStockCount = async () => {
        try {
            const res = await fetch(`/api/admin/stocks/count?marketType=${marketFilter}`, { headers: getAuthHeader() });
            if (res.ok) setTotalStockCount(await res.json());
        } catch (e) {}
    };

    const fetchHolidays = async (year) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/holidays?year=${year}`, { headers: getAuthHeader() });
            if (res.ok) setHolidays(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const fetchUsers = async (keyword = '') => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/users?keyword=${encodeURIComponent(keyword)}`, { headers: getAuthHeader() });
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'stocks' && !searchKeyword) { fetchStocks(0); fetchStockCount(); }
        if (activeTab === 'holidays') fetchHolidays(holidayYear);
        if (activeTab === 'users' && !userSearchKeyword) fetchUsers();
    }, [activeTab, isMobile, marketFilter, holidayYear]);

    const handleSearch = async () => {
        if (!searchKeyword.trim()) { fetchStocks(0); fetchStockCount(); return; }
        try {
            setIsLoading(true);
            const res = await fetch(`/api/stocks/search?keyword=${encodeURIComponent(searchKeyword)}`, { headers: getAuthHeader() });
            if (res.ok) {
                let data = await res.json();
                if (marketFilter !== 'ALL') data = data.filter(s => s.marketType === marketFilter);
                setStocks(data);
                setTotalStockCount(data.length);
                setPage(0);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleUserSearch = () => { fetchUsers(userSearchKeyword); };

    const handleSaveStock = async () => {
        // [v17.9] 상장종목 필수값 검증
        if (!formData.stockCode?.trim()) return setErrorPopup("종목 코드를 입력해주세요.");
        if (!formData.stockName?.trim()) return setErrorPopup("종목 명칭을 입력해주세요.");

        const method = editingStock ? 'PUT' : 'POST';
        try {
            const res = await fetch('/api/admin/stocks', {
                method,
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) { 
                setIsModalOpen(false); 
                fetchStocks(page); 
                fetchStockCount(); 
            } else {
                const err = await res.json();
                setErrorPopup(err?.message || "오류가 발생했습니다.");
            }
        } catch (e) { setErrorPopup("서버 통신 오류가 발생했습니다."); }
    };

    const handleSaveHoliday = async () => {
        // [v17.9] 공휴일 필수값 검증 (SQL 1525 에러 방지)
        if (!holidayFormData.holiday_date?.trim()) return setErrorPopup("공휴일 날짜를 선택해주세요.");
        if (!holidayFormData.holiday_name?.trim()) return setErrorPopup("공휴일 명칭을 입력해주세요.");

        const method = editingHoliday ? 'PUT' : 'POST';
        try {
            const res = await fetch('/api/admin/holidays', {
                method,
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(holidayFormData)
            });
            if (res.ok) { 
                setIsHolidayModalOpen(false); 
                fetchHolidays(holidayYear); 
            } else {
                const err = await res.json();
                setErrorPopup(err?.message || "오류가 발생했습니다.");
            }
        } catch (e) { setErrorPopup("서버 통신 오류가 발생했습니다."); }
    };

    const handleSaveUser = async () => {
        // [v17.9] 사용자 필수값 검증
        const { usrId, usrName, email, phoneNumber, password } = userFormData;
        if (!usrId?.trim()) return setErrorPopup("사용자 ID를 입력해주세요.");
        if (!usrName?.trim()) return setErrorPopup("이름을 입력해주세요.");
        if (!email?.trim()) return setErrorPopup("이메일을 입력해주세요.");
        if (!phoneNumber?.trim()) return setErrorPopup("연락처를 입력해주세요.");
        if (!editingUser && (!password || !password.trim())) {
            return setErrorPopup("신규 사용자 등록 시 비밀번호는 필수입니다.");
        }

        const method = editingUser ? 'PUT' : 'POST';
        try {
            const res = await fetch('/api/admin/users', {
                method,
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(userFormData)
            });
            if (res.ok) { setIsUserModalOpen(false); fetchUsers(userSearchKeyword); }
            else { const err = await res.json(); setErrorPopup(err?.message || "오류가 발생했습니다."); }
        } catch (e) { setErrorPopup("서버 통신 오류가 발생했습니다."); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/stocks/${deleteTarget.stockCode}`, { method: 'DELETE', headers: getAuthHeader() });
            if (res.ok) { setDeleteConfirm(null); fetchStocks(page); fetchStockCount(); }
        } catch (e) {}
    };

    const confirmDeleteHoliday = async () => {
        if (!deleteHolidayTarget) return;
        try {
            const res = await fetch(`/api/admin/holidays/${deleteHolidayTarget.id}`, { method: 'DELETE', headers: getAuthHeader() });
            if (res.ok) { setDeleteHolidayConfirm(null); fetchHolidays(holidayYear); }
        } catch (e) {}
    };

    const confirmDeleteUser = async () => {
        if (!deleteUserTarget) return;
        try {
            const res = await fetch(`/api/admin/users/${deleteUserTarget.usrId}`, { method: 'DELETE', headers: getAuthHeader() });
            if (res.ok) { setDeleteUserConfirm(null); fetchUsers(userSearchKeyword); }
        } catch (e) {}
    };

    // [v30.36] 파이썬 지능형 스캐너 연동 핸들러 (정밀 주입)
    const handleScanRepo = async () => {
        if (!gitUrl.trim()) return setErrorPopup("Git URL을 입력하세요.");
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/doc/scan?gitUrl=${encodeURIComponent(gitUrl)}`, { headers: getAuthHeader() });
            if (!res.ok) throw new Error("스캔 엔진 구동 실패");
            const data = await res.json();
            setScannedData(data);
            return data;
        } catch (e) { setErrorPopup(e.message); return null; } finally { setIsLoading(false); }
    };

    const handleDownloadDoc = async () => {
        let data = scannedData || await handleScanRepo();
        if (!data || data.status !== 'SUCCESS') return;
        try {
            const { apis, tables } = data;
            let html = `<html><head><meta charset='utf-8'><style>
                body { font-family: 'Malgun Gothic', sans-serif; padding: 20px; color: #1e293b; }
                h1 { color: #4f46e5; text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; font-size: 22pt; }
                .section-header { background: #1e293b; color: #ffffff; padding: 12px; margin-top: 40px; font-size: 16pt; text-align: center; font-weight: bold; border-radius: 8px; }
                h2 { color: #4f46e5; background: #f8fafc; padding: 8px; border-left: 5px solid #4f46e5; margin-top: 30px; font-size: 14pt; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 15px; table-layout: fixed; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9pt; text-align: left; word-wrap: break-word; }
                th { background: #f1f5f9; font-weight: bold; color: #475569; }
                .mapping-header { background: #6366f1 !important; color: white !important; }
                .table-header { background: #10b981 !important; color: white !important; }
                pre { background: #0f172a; color: #f8fafc; padding: 12px; border-radius: 5px; font-family: 'Courier New', monospace; font-size: 8pt; white-space: pre-wrap; }
                .pk-badge { color: #e11d48; font-weight: bold; }
            </style></head><body>
                <h1>StockPlus System Intelligent Specification</h1>
                <p style='text-align: right;'>Generated: ${new Date().toLocaleString()}</p>
                <div class='section-header'>SECTION I. API INTERFACE & DATA MAPPING</div>`;
            
            apis?.forEach((spec, index) => {
                html += `<div style='margin-bottom: 40px;'><h2>${index + 1}. ${spec.function} API</h2><table><tr><th style='width: 20%;'>Endpoint</th><td style='font-family: monospace; font-weight: bold; color: #4f46e5;'>${spec.url}</td></tr><tr><th>Method</th><td><b>${spec.method}</b></td></tr></table>
                <h3>▶ Data Mapping Specification</h3><table><thead><tr><th class='mapping-header' style='width: 25%;'>JSON Key</th><th class='mapping-header'>Description & Type</th><th class='mapping-header' style='width: 25%;'>DB Mapping</th></tr></thead><tbody>
                ${spec.mapping && spec.mapping.length > 0 ? 
                    spec.mapping.map(f => `<tr><td style='font-weight: bold;'>${f.key}</td><td>${f.desc} (${f.type})</td><td style='color: #6366f1; font-family: monospace;'>${f.db || f.key.replace(/([A-Z])/g, "_$1").toLowerCase()}</td></tr>`).join('') :
                    '<tr><td colspan="3" style="text-align: center;">No mapping data available</td></tr>'}
                </tbody></table><h3>▶ Request JSON Sample</h3><pre>${spec.sample || '{}'}</pre></div>`;
            });

            html += `<div class='section-header' style='page-break-before: always;'>SECTION II. DATABASE SCHEMA DESIGN</div>`;
            tables?.forEach(table => {
                html += `<div style='margin-bottom: 30px;'><h2>TABLE: ${table.table}</h2><p>용도: ${table.usage}</p><table><thead><tr><th class='table-header' style='width: 20%;'>Column</th><th class='table-header' style='width: 15%;'>Type(Size)</th><th class='table-header' style='width: 8%; text-align: center;'>PK</th><th class='table-header' style='width: 8%; text-align: center;'>Null</th><th class='table-header'>Description</th></tr></thead><tbody>
                ${table.columns && table.columns.length > 0 ? 
                    table.columns.map(col => `<tr><td style='font-weight: bold;'>${col.name}</td><td style='color: #059669;'>${col.type}${col.size !== '-' ? `(${col.size})` : ''}</td><td style='text-align: center;' class='${col.pk === 'Y' ? 'pk-badge' : ''}'>${col.pk}</td><td style='text-align: center;'>${col.null}</td><td>${col.desc || '-'}</td></tr>`).join('') :
                    '<tr><td colspan="5" style="text-align: center;">No columns extracted</td></tr>'}
                </tbody></table></div>`;
            });
            html += "</body></html>";
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = `StockPlus_Full_Spec_${new Date().toISOString().split('T')[0]}.doc`;
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        } catch (e) { setErrorPopup(e.message); }
    };

    return (
        <div className="flex-1 bg-slate-950 p-2 lg:p-8 overflow-hidden h-[100dvh] lg:h-full flex flex-col gap-3 lg:gap-6 relative pb-28 lg:pb-5">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shrink-0">
                <div><h1 className="text-xl lg:text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-2"><Settings className="text-indigo-500" size={isMobile ? 22 : 32} /> 시스템 관리</h1><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Platform Master Configuration</p></div>
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-lg self-stretch lg:self-auto overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('stocks')} className={classNames("flex-1 lg:flex-none px-4 lg:px-6 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap", activeTab === 'stocks' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}><Box size={14} /> 상장종목</button>
                    <button onClick={() => setActiveTab('holidays')} className={classNames("flex-1 lg:flex-none px-4 lg:px-6 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap", activeTab === 'holidays' ? "bg-cyan-600 text-white" : "text-slate-500 hover:text-slate-300")}><Calendar size={14} /> 공휴일</button>
                    <button onClick={() => setActiveTab('users')} className={classNames("flex-1 lg:flex-none px-4 lg:px-6 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap", activeTab === 'users' ? "bg-rose-600 text-white" : "text-slate-500 hover:text-slate-300")}><Users size={14} /> 사용자</button>
                    <button onClick={() => setActiveTab('api')} className={classNames("flex-1 lg:flex-none px-4 lg:px-6 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-black transition-all flex items-center justify-center gap-2 whitespace-nowrap", activeTab === 'api' ? "bg-amber-600 text-white" : "text-slate-500 hover:text-slate-300")}><Link size={14} /> API 가이드</button>
                </div>
            </header>

            {activeTab === 'stocks' && (
                <div className="flex-1 min-h-0 flex flex-col gap-3 lg:gap-4 animate-in fade-in duration-300">
                    <div className="flex flex-col lg:flex-row gap-2 shrink-0">
                        <div className="flex-1 flex gap-2">
                            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="종목명/코드..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs lg:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50" /></div>
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2 lg:px-3"><span className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-tighter whitespace-nowrap">Market</span><select value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)} className="bg-transparent text-[11px] lg:text-sm text-white focus:outline-none font-bold cursor-pointer py-2"><option value="ALL" className="bg-slate-900 text-white">전체</option><option value="KOSPI" className="bg-slate-900 text-white">KOSPI</option><option value="KOSDAQ" className="bg-slate-900 text-white">KOSDAQ</option></select></div>
                        </div>
                        <div className="flex gap-2"><button onClick={handleSearch} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg">검색</button><button onClick={() => { setEditingStock(null); setFormData({ stockCode: '', stockName: '', exchangeCode: 'J', marketType: 'KOSPI' }); setIsModalOpen(true); }} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"><Plus size={16} /> 신규</button></div>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="overflow-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead className="bg-slate-950/50 sticky top-0 z-10 shadow-sm"><tr className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="px-2 lg:px-6 py-3 lg:py-4">Market</th><th className="px-2 lg:px-6 py-3 lg:py-4">Code</th><th className="px-2 lg:px-6 py-3 lg:py-4">Name</th><th className="px-2 lg:px-6 py-3 lg:py-4 text-right">Acts</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {isLoading ? (<tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto mb-2" /><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Loading...</p></td></tr>) : stocks.length > 0 ? (
                                        stocks.map(s => (<tr key={s.stockCode} className="hover:bg-indigo-600/5 transition-colors group"><td className="px-2 lg:px-6 py-2.5 lg:py-4"><span className={classNames("px-1.5 py-0.5 rounded text-[8px] lg:text-[10px] font-black", s.marketType === 'KOSPI' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20")}>{s.marketType || 'KOSPI'}</span></td><td className="px-2 lg:px-6 py-2.5 lg:py-4 font-mono text-[10px] lg:text-sm text-indigo-400 font-bold">{s.stockCode}</td><td className="px-2 lg:px-6 py-2.5 lg:py-4 font-black text-white text-[11px] lg:text-sm truncate max-w-[100px] lg:max-w-none">{s.stockName}</td><td className="px-2 lg:px-6 py-2.5 lg:py-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => { setEditingStock(s); setFormData({ stockCode: s.stockCode, stockName: s.stockName, exchangeCode: s.exchangeCode || 'J', marketType: s.marketType || 'KOSPI' }); setIsModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Edit2 size={14} /></button><button onClick={() => setDeleteConfirm(s)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={14} /></button></div></td></tr>))
                                    ) : (<tr><td colSpan="4" className="py-20 text-center text-slate-600 font-bold italic uppercase tracking-widest text-[10px]">No stocks found</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                        {!searchKeyword && (
                            <div className="p-3 lg:p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">P.{page+1} ({isMobile ? '10':'50'}) / <span className="text-indigo-400 font-mono">{marketFilter}: {totalStockCount.toLocaleString()}개</span></span>
                                <div className="flex gap-1.5">
                                    <button disabled={page === 0 || isLoading} onClick={() => fetchStocks(page - 1)} className="p-1.5 bg-slate-800 rounded-lg text-white disabled:opacity-30 active:bg-slate-700"><ChevronLeft size={16} /></button>
                                    <button disabled={stocks.length < pageSize || isLoading} onClick={() => fetchStocks(page + 1)} className="p-1.5 bg-slate-800 rounded-lg text-white disabled:opacity-30 active:bg-slate-700"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'holidays' && (
                <div className="flex-1 min-h-0 flex flex-col gap-3 lg:gap-4 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-end items-center gap-2 shrink-0">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2 lg:px-3"><span className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-tighter whitespace-nowrap">Year</span><select value={holidayYear} onChange={(e) => setHolidayYear(parseInt(e.target.value))} className="bg-transparent text-[11px] lg:text-sm text-white focus:outline-none font-bold cursor-pointer py-2 min-w-[60px] lg:min-w-[80px]">{[2026, 2027, 2028].map(y => <option key={y} value={y} className="bg-slate-900 text-white">{y}년</option>)}</select></div>
                        <button onClick={() => { setEditingHoliday(null); setHolidayFormData({ holiday_date: '', holiday_name: '', holiday_year: holidayYear }); setIsHolidayModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"><Plus size={16} /> 신규 등록</button>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="overflow-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead className="bg-slate-950/50 sticky top-0 z-10 shadow-sm"><tr className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="px-4 lg:px-6 py-3 lg:py-4">Date</th><th className="px-4 lg:px-6 py-3 lg:py-4">Name</th><th className="px-4 lg:px-6 py-3 lg:py-4 text-right">Acts</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {isLoading ? (<tr><td colSpan="3" className="py-20 text-center"><Loader2 className="animate-spin text-cyan-500 mx-auto mb-2" /></td></tr>) : holidays.length > 0 ? (
                                        holidays.map(h => (<tr key={h.id} className="hover:bg-cyan-600/5 transition-colors group"><td className="px-4 lg:px-6 py-3 lg:py-4 font-mono text-xs lg:text-sm text-cyan-400 font-bold">{h.holiday_date}</td><td className="px-4 lg:px-6 py-3 lg:py-4 font-black text-white text-xs lg:text-sm">{h.holiday_name}</td><td className="px-4 lg:px-6 py-3 lg:py-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => { setEditingHoliday(h); setHolidayFormData({ id: h.id, holiday_date: h.holiday_date, holiday_name: h.holiday_name, holiday_year: h.holiday_year }); setIsHolidayModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Edit2 size={14} /></button><button onClick={() => setDeleteHolidayConfirm(h)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={14} /></button></div></td></tr>))
                                    ) : (<tr><td colSpan="3" className="py-20 text-center text-slate-600 font-bold italic uppercase tracking-widest text-[10px]">No holidays found</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="flex-1 min-h-0 flex flex-col gap-3 lg:gap-4 animate-in fade-in duration-300">
                    <div className="flex flex-col lg:flex-row gap-2 shrink-0 px-1">
                        <div className="flex-1 flex gap-2">
                            <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="text" placeholder="사용자 ID/이름 검색..." value={userSearchKeyword} onChange={(e) => setUserSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs lg:text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50" /></div>
                            <button onClick={handleUserSearch} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg">검색</button>
                        </div>
                        <button onClick={() => { setEditingUser(null); setUserFormData({ usrId: '', usrName: '', email: '', phoneNumber: '', role: 'USER', useyn: 'Y', password: '' }); setIsUserModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"><UserPlus size={16} /> 신규 사용자</button>
                    </div>
                    <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="overflow-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead className="bg-slate-950/50 sticky top-0 z-10 shadow-sm"><tr className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="px-2 lg:px-6 py-3 lg:py-4">User Info</th><th className="px-2 lg:px-6 py-3 lg:py-4 text-center">Role</th><th className="px-2 lg:px-6 py-3 lg:py-4 text-center">Status</th><th className="px-2 lg:px-6 py-3 lg:py-4 text-right">Acts</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {isLoading ? (<tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin text-rose-500 mx-auto mb-2" /></td></tr>) : users.length > 0 ? (
                                        users.map(u => (<tr key={u.usrId} className="hover:bg-rose-600/5 transition-colors group"><td className="px-2 lg:px-6 py-2.5 lg:py-4"><div className="flex flex-col"><span className="text-white font-black text-[11px] lg:text-sm">{u.usrName}</span><span className="text-slate-500 font-mono text-[9px] lg:text-[10px]">{u.usrId}</span></div></td><td className="px-2 lg:px-6 py-2.5 lg:py-4 text-center"><div className="flex items-center justify-center gap-1.5"><Shield size={12} className={u.role === 'ADMIN' ? 'text-amber-500' : 'text-slate-500'} /><span className={classNames("text-[10px] font-black uppercase tracking-tighter", u.role === 'ADMIN' ? "text-amber-500" : "text-slate-400")}>{u.role}</span></div></td><td className="px-2 lg:px-6 py-2.5 lg:py-4 text-center"><div className="flex justify-center"><span className={classNames("px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 w-fit", u.useyn === 'Y' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20")}>{u.useyn === 'Y' ? <UserCheck size={10} /> : <UserX size={10} />}{u.useyn === 'Y' ? 'ACTIVE' : 'BLOCKED'}</span></div></td><td className="px-2 lg:px-6 py-2.5 lg:py-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => { setEditingUser(u); setUserFormData({ usrId: u.usrId, usrName: u.usrName, email: u.email, phoneNumber: u.phoneNumber, role: u.role || 'USER', useyn: u.useyn || 'Y', password: '' }); setIsUserModalOpen(true); }} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Edit2 size={14} /></button><button onClick={() => setDeleteUserConfirm(u)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={14} /></button></div></td></tr>))
                                    ) : (<tr><td colSpan="4" className="py-20 text-center text-slate-600 font-bold italic uppercase tracking-widest text-[10px]">No users found</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'api' && (
                <div className="flex-1 min-h-0 flex flex-col gap-4 animate-in fade-in duration-300 overflow-hidden">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl shrink-0 flex flex-col lg:flex-row items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20"><Link className="text-amber-500" size={32} /></div>
                        <div className="flex-1 w-full space-y-3">
                            <h3 className="text-white font-black text-lg uppercase italic tracking-tighter">Ultimate Spec Engine (Python AI)</h3>
                            <div className="relative group">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/50" size={16} />
                                <input type="password" value={gitUrl} onChange={(e) => setGitUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-xs text-white focus:ring-2 focus:ring-amber-500/50 transition-all font-mono" placeholder="Enter Protected Git URL" />
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button onClick={handleScanRepo} disabled={isLoading} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 font-black rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">{isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} 스캔 시작</button>
                            <button onClick={handleDownloadDoc} disabled={isLoading || !scannedData} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"><Save size={16} /> 다운로드</button>
                        </div>
                    </div>

                    <div className="flex bg-slate-950/50 border border-slate-800 p-1 rounded-2xl w-fit shrink-0">
                        <button onClick={() => setActiveSubTab('apis')} className={classNames("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeSubTab === 'apis' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "text-slate-500 hover:text-slate-300")}>API Interface</button>
                        <button onClick={() => setActiveSubTab('tables')} className={classNames("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeSubTab === 'tables' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300")}>Database Schema</button>
                    </div>

                    <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center shrink-0">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {activeSubTab === 'apis' ? `Analysis Results: ${scannedData?.total_apis || 0} APIs` : `Database Inventory: ${scannedData?.total_tables || 0} Tables`}
                            </span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-3">
                            {activeSubTab === 'apis' ? (
                                scannedData?.apis?.map((spec, idx) => (
                                    <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden group">
                                        <button onClick={() => setExpandedApi(expandedApi === idx ? null : idx)} className="w-full px-5 py-4 flex items-center justify-between text-white hover:bg-white/5 transition-all font-black">
                                            <div className="flex items-center gap-4">
                                                <span className={classNames("px-2 py-0.5 rounded text-[9px] w-12 text-center", spec.method === 'POST' ? "bg-rose-500/10 text-rose-400" : "bg-cyan-500/10 text-cyan-400")}>{spec.method}</span>
                                                <span className="text-sm font-mono">{spec.url}</span>
                                                <span className="text-[10px] text-slate-500 hidden lg:inline">({spec.function})</span>
                                            </div>
                                            <ChevronDown size={16} className={classNames("text-slate-600 transition-transform", expandedApi === idx && "rotate-180")} />
                                        </button>
                                        {expandedApi === idx && (
                                            <div className="px-5 pb-5 pt-2 border-t border-slate-800/50 grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">▶ Data Mapping Spec</h4>
                                                    <table className="w-full text-left text-[10px] border-collapse bg-slate-900/50 rounded-xl overflow-hidden">
                                                        <thead><tr className="bg-slate-800 text-slate-500 uppercase"><th className="px-3 py-2">Field</th><th className="px-3 py-2">Mapping & Desc</th></tr></thead>
                                                        <tbody className="divide-y divide-slate-800">
                                                            {spec.mapping?.map(f => (
                                                                <tr key={f.key}><td className="px-3 py-2 font-mono text-white font-bold">{f.key}</td><td className="px-3 py-2 text-slate-400">{f.desc} ({f.type})</td></tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">▶ JSON Sample</h4>
                                                    <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto">{spec.sample || '{}'}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                scannedData?.tables?.map((table, idx) => (
                                    <div key={idx} className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden group">
                                        <button onClick={() => setExpandedTable(expandedTable === idx ? null : idx)} className="w-full px-5 py-4 flex items-center justify-between text-white hover:bg-white/5 transition-all font-black">
                                            <div className="flex items-center gap-4">
                                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400"><Database size={14} /></div>
                                                <span className="text-sm font-mono uppercase">{table.table}</span>
                                                <span className="text-[10px] text-slate-500 hidden lg:inline">{table.usage}</span>
                                            </div>
                                            <ChevronDown size={16} className={classNames("text-slate-600 transition-transform", expandedTable === idx && "rotate-180")} />
                                        </button>
                                        {expandedTable === idx && (
                                            <div className="px-5 pb-5 pt-2 border-t border-slate-800/50 animate-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">▶ Database Schema Spec</h4>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-[10px] border-collapse bg-slate-900/50 rounded-xl overflow-hidden min-w-[600px]">
                                                            <thead><tr className="bg-slate-800 text-slate-500 uppercase"><th className="px-3 py-2 w-[25%]">Column</th><th className="px-3 py-2 w-[20%]">Type(Size)</th><th className="px-3 py-2 w-[8%] text-center">PK</th><th className="px-3 py-2 w-[8%] text-center">Null</th><th className="px-3 py-2">Description</th></tr></thead>
                                                            <tbody className="divide-y divide-slate-800">
                                                                {table.columns?.map(col => (
                                                                    <tr key={col.name} className="hover:bg-white/5 transition-colors">
                                                                        <td className="px-3 py-2 font-mono text-white font-bold">{col.name}</td>
                                                                        <td className="px-3 py-2 text-emerald-400">{col.type}{col.size !== '-' ? `(${col.size})` : ''}</td>
                                                                        <td className="px-3 py-2 text-center">{col.pk === 'Y' ? <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-black text-[8px] border border-rose-500/30">PK</span> : <span className="text-slate-700">-</span>}</td>
                                                                        <td className="px-3 py-2 text-center"><span className={classNames("text-[9px] font-bold", col.null === 'Y' ? "text-slate-500" : "text-amber-500")}>{col.null === 'Y' ? 'YES' : 'N-NULL'}</span></td>
                                                                        <td className="px-3 py-2 text-slate-400 italic text-[9px]">{col.desc}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                            {(!scannedData || (activeSubTab === 'apis' ? !scannedData.apis : !scannedData.tables)) && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-600 py-20 gap-3 opacity-30">
                                    <Database size={48} />
                                    <p className="font-black text-xs uppercase tracking-[0.3em]">{scannedData?.status === 'ERROR' ? scannedData.message : 'Ready to scan repository'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 상장종목 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-5 lg:p-6 border-b border-slate-800 bg-slate-850 flex justify-between items-center text-white"><h3 className="text-base font-black uppercase italic">{editingStock ? '종목 수정' : '신규 종목'}</h3><button onClick={() => setIsModalOpen(false)}><X size={20}/></button></div>
                        <div className="p-6 lg:p-8 space-y-4">
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Code <span className="text-rose-500">*</span></label><input type="text" value={formData.stockCode} readOnly={!!editingStock} onChange={(e) => setFormData({...formData, stockCode: e.target.value})} className={classNames("w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono", editingStock && "opacity-50")} /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Name <span className="text-rose-500">*</span></label><input type="text" value={formData.stockName} onChange={(e) => setFormData({...formData, stockName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Market</label><select value={formData.marketType} onChange={(e) => setFormData({...formData, marketType: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-bold"><option value="KOSPI" className="bg-slate-900">KOSPI</option><option value="KOSDAQ" className="bg-slate-900">KOSDAQ</option></select></div>
                        </div>
                        <div className="p-5 bg-slate-850 flex gap-3"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">취소</button><button onClick={handleSaveStock} className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs">저장</button></div>
                    </div>
                </div>
            )}

            {/* 사용자 모달 */}
            {isUserModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-5 lg:p-6 border-b border-slate-800 bg-slate-850 flex justify-between items-center text-white"><h3 className="text-base font-black uppercase italic">{editingUser ? '사용자 정보 수정' : '신규 사용자 등록'}</h3><button onClick={() => setIsUserModalOpen(false)}><X size={20}/></button></div>
                        <div className="p-6 lg:p-8 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">ID (User Account) <span className="text-rose-500">*</span></label><input type="text" value={userFormData.usrId} readOnly={!!editingUser} onChange={(e) => setUserFormData({...userFormData, usrId: e.target.value})} className={classNames("w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono", editingUser && "opacity-50")} placeholder="사용자 아이디" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-2 tracking-widest"><Key size={10} /> {editingUser ? '비밀번호 변경 (필요시)' : '비밀번호'} {!editingUser && <span className="text-rose-500">*</span>}</label><input type="password" value={userFormData.password} onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" placeholder={editingUser ? "변경하지 않으려면 비워두세요" : "비밀번호 입력"} /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">이름 (Full Name) <span className="text-rose-500">*</span></label><input type="text" value={userFormData.usrName} onChange={(e) => setUserFormData({...userFormData, usrName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-black" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">권한</label><select value={userFormData.role} onChange={(e) => setUserFormData({...userFormData, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-bold"><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select></div>
                                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">상태</label><select value={userFormData.useyn} onChange={(e) => setUserFormData({...userFormData, useyn: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-bold"><option value="Y">ACTIVE</option><option value="N">BLOCKED</option></select></div>
                            </div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">이메일 <span className="text-rose-500">*</span></label><input type="email" value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase">연락처 <span className="text-rose-500">*</span></label><input type="text" value={userFormData.phoneNumber} onChange={(e) => setUserFormData({...userFormData, phoneNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" /></div>
                        </div>
                        <div className="p-5 bg-slate-850 flex gap-3"><button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">취소</button><button onClick={handleSaveUser} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/20">저장</button></div>
                    </div>
                </div>
            )}

            {/* 공휴일 모달 */}
            {isHolidayModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsHolidayModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-5 lg:p-6 border-b border-slate-800 bg-slate-850 flex justify-between items-center text-white"><h3 className="text-base font-black uppercase italic text-cyan-400">{editingHoliday ? '공휴일 수정' : '공휴일 등록'}</h3><button onClick={() => setIsHolidayModalOpen(false)}><X size={20}/></button></div>
                        <div className="p-6 lg:p-8 space-y-4">
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">날짜 선택 <span className="text-rose-500">*</span></label><div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500 pointer-events-none" size={16} /><input type="date" value={holidayFormData.holiday_date} onClick={(e) => e.target.showPicker && e.target.showPicker()} onChange={(e) => { const date = e.target.value; setHolidayFormData({...holidayFormData, holiday_date: date, holiday_year: new Date(date).getFullYear()}); }} className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500 [color-scheme:dark]" /></div></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">공휴일 명칭 <span className="text-rose-500">*</span></label><input type="text" value={holidayFormData.holiday_name} onChange={(e) => setHolidayFormData({...holidayFormData, holiday_name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-cyan-500" placeholder="예: 삼일절" /></div>
                        </div>
                        <div className="p-5 bg-slate-850 flex gap-3"><button onClick={() => setIsHolidayModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">취소</button><button onClick={handleSaveHoliday} className="flex-1 py-2.5 bg-cyan-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-600/20">{editingHoliday ? '수정완료' : '등록하기'}</button></div>
                    </div>
                </div>
            )}

            {/* 삭제 확인 모달들 */}
            {(deleteTarget || deleteHolidayTarget || deleteUserTarget) && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={() => { setDeleteConfirm(null); setDeleteHolidayConfirm(null); setDeleteUserConfirm(null); }}></div>
                    <div className="relative w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200"><div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center"><AlertCircle className="text-rose-500" size={24} /></div><div><h3 className="text-lg font-black text-white mb-1">삭제 확인</h3><p className="text-slate-400 text-xs">정말 삭제하시겠습니까?</p></div><div className="flex gap-2 w-full mt-2"><button onClick={() => { setDeleteConfirm(null); setDeleteHolidayConfirm(null); setDeleteUserConfirm(null); }} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">아니오</button><button onClick={deleteTarget ? confirmDelete : (deleteHolidayTarget ? confirmDeleteHoliday : confirmDeleteUser)} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs">삭제</button></div></div>
                </div>
            )}

            {/* 커스텀 에러 팝업 (v17.9) */}
            {errorPopup && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setErrorPopup(null)}></div>
                    <div className="relative w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center animate-bounce-slow"><AlertTriangle className="text-rose-500" size={32} /></div>
                        <div>
                            <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tight">Warning</h3>
                            <p className="text-slate-300 text-sm font-bold leading-relaxed whitespace-pre-wrap">{errorPopup}</p>
                        </div>
                        <button onClick={() => setErrorPopup(null)} className="w-full py-3 bg-rose-600 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-500 active:scale-95">확인했습니다</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSystemManagement;
