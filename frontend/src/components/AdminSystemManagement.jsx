import React, { useState, useEffect } from 'react';
import { Settings, Users, Box, Search, Plus, Edit2, Trash2, X, Save, Loader2, AlertTriangle, ChevronLeft, ChevronRight, AlertCircle, Filter, UserCheck, UserX, Shield, User } from 'lucide-react';
import { getAuthHeader } from '../api/stockApi';
import classNames from 'classnames';

const AdminSystemManagement = () => {
    const [activeTab, setActiveTab] = useState('stocks');
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [marketFilter, setMarketFilter] = useState('ALL'); // 'ALL', 'KOSPI', 'KOSDAQ'
    
    const isMobile = window.innerWidth < 1024;
    const pageSize = isMobile ? 10 : 50;
    const [page, setPage] = useState(0);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStock, setEditingStock] = useState(null);
    const [formData, setFormData] = useState({ stockCode: '', stockName: '', exchangeCode: 'J', marketType: 'KOSPI' });
    const [deleteTarget, setDeleteConfirm] = useState(null); 

    // --- User Management [v17.8] ---
    const [users, setUsers] = useState([]);
    const [userSearchKeyword, setUserSearchKeyword] = useState(''); // [v17.9] 사용자 검색어 추가
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({ usrId: '', usrName: '', email: '', phoneNumber: '', role: 'USER', useyn: 'Y', password: '' });

    const fetchStocks = async (p = 0) => {
        try {
            setIsLoading(true);
            const offset = p * pageSize;
            const res = await fetch(`/stockPlus/api/admin/stocks?limit=${pageSize}&offset=${offset}&marketType=${marketFilter}`, { headers: getAuthHeader() });
            if (res.ok) {
                setStocks(await res.json());
                setPage(p);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const fetchUsers = async (keyword = '') => {
        try {
            setIsLoading(true);
            const url = keyword ? `/stockPlus/api/admin/users?keyword=${encodeURIComponent(keyword)}` : '/stockPlus/api/admin/users';
            const res = await fetch(url, { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'stocks' && !searchKeyword) fetchStocks(0);
        if (activeTab === 'users' && !userSearchKeyword) fetchUsers();
    }, [activeTab, isMobile, marketFilter]);

    const handleSearch = async () => {
        if (!searchKeyword.trim()) { fetchStocks(0); return; }
        try {
            setIsLoading(true);
            const res = await fetch(`/stockPlus/api/stocks/search?keyword=${encodeURIComponent(searchKeyword)}`, { headers: getAuthHeader() });
            if (res.ok) {
                let data = await res.json();
                if (marketFilter !== 'ALL') {
                    data = data.filter(s => s.marketType === marketFilter);
                }
                setStocks(data);
                setPage(0);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleUserSearch = () => {
        fetchUsers(userSearchKeyword);
    };

    const handleSaveStock = async () => {
        const method = editingStock ? 'PUT' : 'POST';
        try {
            const res = await fetch('/stockPlus/api/admin/stocks', {
                method,
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchStocks(page);
            }
        } catch (e) { console.error(e); }
    };

    const handleSaveUser = async () => {
        const method = editingUser ? 'PUT' : 'POST';
        try {
            const res = await fetch('/stockPlus/api/admin/users', {
                method,
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(userFormData)
            });
            if (res.ok) {
                setIsUserModalOpen(false);
                fetchUsers(userSearchKeyword);
            } else {
                const errData = await res.json();
                alert(`저장 실패: ${errData.message || '알 수 없는 오류'}`);
            }
        } catch (e) { console.error(e); }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/stockPlus/api/admin/stocks/${deleteTarget.stockCode}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            if (res.ok) {
                setDeleteConfirm(null);
                fetchStocks(page);
            }
        } catch (e) { console.error(e); }
    };

    const openEditModal = (stock) => {
        setEditingStock(stock);
        setFormData({ stockCode: stock.stockCode, stockName: stock.stockName, exchangeCode: stock.exchangeCode || 'J', marketType: stock.marketType || 'KOSPI' });
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingStock(null);
        setFormData({ stockCode: '', stockName: '', exchangeCode: 'J', marketType: 'KOSPI' });
        setIsModalOpen(true);
    };

    const openUserEditModal = (user) => {
        setEditingUser(user);
        setUserFormData({ 
            usrId: user.usrId, 
            usrName: user.usrName, 
            email: user.email, 
            phoneNumber: user.phoneNumber, 
            role: user.role || 'USER', 
            useyn: user.useyn || 'Y',
            password: '' 
        });
        setIsUserModalOpen(true);
    };

    const openUserAddModal = () => {
        setEditingUser(null);
        setUserFormData({ 
            usrId: '', 
            usrName: '', 
            email: '', 
            phoneNumber: '', 
            role: 'USER', 
            useyn: 'Y',
            password: '' 
        });
        setIsUserModalOpen(true);
    };

    return (
        <div className="flex-1 bg-slate-950 p-2 lg:p-8 overflow-hidden h-[100dvh] lg:h-full flex flex-col gap-3 lg:gap-6 relative pb-28 lg:pb-5">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 shrink-0">
                <div>
                    <h1 className="text-xl lg:text-3xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                        <Settings className="text-indigo-500" size={isMobile ? 22 : 32} /> 시스템 관리
                    </h1>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Platform Master Configuration</p>
                </div>
                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-lg self-stretch lg:self-auto">
                    <button onClick={() => setActiveTab('stocks')} className={classNames("flex-1 lg:flex-none px-4 lg:px-6 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-black transition-all flex items-center justify-center gap-2", activeTab === 'stocks' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300")}>
                        <Box size={14} /> 상장종목
                    </button>
                    <button onClick={() => setActiveTab('users')} className={classNames("flex-1 lg:flex-none px-4 lg:px-6 py-1.5 lg:py-2 rounded-lg text-[10px] lg:text-xs font-black transition-all flex items-center justify-center gap-2", activeTab === 'users' ? "bg-rose-600 text-white" : "text-slate-500 hover:text-slate-300")}>
                        <Users size={14} /> 사용자
                    </button>
                </div>
            </header>

            {activeTab === 'stocks' ? (
                <div className="flex-1 min-h-0 flex flex-col gap-3 lg:gap-4 animate-in fade-in duration-300">
                    <div className="flex flex-col lg:flex-row gap-2 shrink-0">
                        <div className="flex-1 flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input 
                                    type="text" placeholder="종목명/코드..." 
                                    value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs lg:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2 lg:px-3">
                                <span className="text-[10px] lg:text-xs font-black text-slate-500 uppercase tracking-tighter whitespace-nowrap">Market</span>
                                <select 
                                    value={marketFilter} onChange={(e) => setMarketFilter(e.target.value)}
                                    className="bg-transparent text-[11px] lg:text-sm text-white focus:outline-none font-bold appearance-none cursor-pointer min-w-[60px] lg:min-w-[80px] py-2"
                                >
                                    <option value="ALL" className="bg-slate-900 text-white">전체</option>
                                    <option value="KOSPI" className="bg-slate-900 text-white">KOSPI</option>
                                    <option value="KOSDAQ" className="bg-slate-900 text-white">KOSDAQ</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSearch} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95">검색</button>
                            <button onClick={openAddModal} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                                <Plus size={16} /> 신규
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="overflow-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead className="bg-slate-950/50 sticky top-0 z-10 shadow-sm">
                                    <tr className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <th className="px-2 lg:px-6 py-3 lg:py-4">Market</th>
                                        <th className="px-2 lg:px-6 py-3 lg:py-4">Code</th>
                                        <th className="px-2 lg:px-6 py-3 lg:py-4">Name</th>
                                        <th className="px-2 lg:px-6 py-3 lg:py-4 text-right">Acts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {isLoading ? (
                                        <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto mb-2" /><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Loading...</p></td></tr>
                                    ) : stocks.length > 0 ? (
                                        stocks.map(s => (
                                            <tr key={s.stockCode} className="hover:bg-indigo-600/5 transition-colors group">
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4"><span className={classNames("px-1.5 py-0.5 rounded text-[8px] lg:text-[10px] font-black", s.marketType === 'KOSPI' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20")}>{s.marketType || 'KOSPI'}</span></td>
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4 font-mono text-[10px] lg:text-sm text-indigo-400 font-bold">{s.stockCode}</td>
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4 font-black text-white text-[11px] lg:text-sm truncate max-w-[100px] lg:max-w-none">{s.stockName}</td>
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => openEditModal(s)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                        <button onClick={() => setDeleteConfirm(s)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="py-20 text-center text-slate-600 font-bold italic uppercase tracking-widest text-[10px]">No stocks found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!searchKeyword && (
                            <div className="p-3 lg:p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">P.{page + 1} ({isMobile ? '10' : '50'})</span>
                                <div className="flex gap-1.5">
                                    <button disabled={page === 0 || isLoading} onClick={() => fetchStocks(page - 1)} className="p-1.5 bg-slate-800 rounded-lg text-white disabled:opacity-30 active:bg-slate-700"><ChevronLeft size={16} /></button>
                                    <button disabled={stocks.length < pageSize || isLoading} onClick={() => fetchStocks(page + 1)} className="p-1.5 bg-slate-800 rounded-lg text-white disabled:opacity-30 active:bg-slate-700"><ChevronRight size={16} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 min-h-0 flex flex-col gap-3 lg:gap-4 animate-in fade-in duration-300">
                    <div className="flex flex-col lg:flex-row gap-2 shrink-0">
                        <div className="flex-1 flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input 
                                    type="text" placeholder="ID / Name 검색..." 
                                    value={userSearchKeyword} onChange={(e) => setUserSearchKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUserSearch()}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs lg:text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 shadow-inner"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleUserSearch} className="flex-1 lg:flex-none bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95">검색</button>
                            <button onClick={openUserAddModal} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                                <Plus size={16} /> 신규
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                        <div className="overflow-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead className="bg-slate-950/50 sticky top-0 z-10 shadow-sm">
                                    <tr className="text-[9px] lg:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <th className="px-2 lg:px-6 py-3 lg:py-4 whitespace-nowrap">ID / Name</th>
                                        <th className="px-2 lg:px-6 py-3 lg:py-4">Role</th>
                                        <th className="px-2 lg:px-6 py-3 lg:py-4">Status</th>
                                        <th className="px-2 lg:px-6 py-3 lg:py-4 text-right">Acts</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {isLoading ? (
                                        <tr><td colSpan="4" className="py-20 text-center"><Loader2 className="animate-spin text-rose-500 mx-auto mb-2" /><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Loading Users...</p></td></tr>
                                    ) : users.length > 0 ? (
                                        users.map(u => (
                                            <tr key={u.usrId} className="hover:bg-rose-600/5 transition-colors group">
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-white font-black text-[11px] lg:text-sm">{u.usrName}</span>
                                                        <span className="text-slate-500 font-mono text-[9px] lg:text-[10px]">{u.usrId}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Shield size={12} className={u.role === 'ADMIN' ? 'text-amber-500' : 'text-slate-500'} />
                                                        <span className={classNames("text-[10px] font-black uppercase tracking-tighter", u.role === 'ADMIN' ? "text-amber-500" : "text-slate-400")}>{u.role}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4">
                                                    <span className={classNames("px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 w-fit", u.useyn === 'Y' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20")}>
                                                        {u.useyn === 'Y' ? <UserCheck size={10} /> : <UserX size={10} />}
                                                        {u.useyn === 'Y' ? 'ACTIVE' : 'BLOCKED'}
                                                    </span>
                                                </td>
                                                <td className="px-2 lg:px-6 py-2.5 lg:py-4 text-right">
                                                    <button onClick={() => openUserEditModal(u)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="py-20 text-center text-slate-600 font-bold italic uppercase tracking-widest text-[10px]">No users found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 lg:p-6 border-b border-slate-800 bg-slate-850 flex justify-between items-center text-white">
                            <h3 className="text-base font-black uppercase italic">{editingStock ? '종목 정보 수정' : '신규 종목 등록'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 lg:p-8 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Stock Code</label>
                                <input type="text" value={formData.stockCode} readOnly={!!editingStock} onChange={(e) => setFormData({...formData, stockCode: e.target.value})} className={classNames("w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white", editingStock && "opacity-50")} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Stock Name</label>
                                <input type="text" value={formData.stockName} onChange={(e) => setFormData({...formData, stockName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Market Type</label>
                                <select value={formData.marketType} onChange={(e) => setFormData({...formData, marketType: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                                    <option value="KOSPI" className="bg-slate-900 text-white">KOSPI</option>
                                    <option value="KOSDAQ" className="bg-slate-900 text-white">KOSDAQ</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-850 flex gap-3"><button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">취소</button><button onClick={handleSaveStock} className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"><Save size={16} /> 저장</button></div>
                    </div>
                </div>
            )}

            {isUserModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 lg:p-6 border-b border-slate-800 bg-slate-850 flex justify-between items-center text-white">
                            <h3 className="text-base font-black uppercase italic">{editingUser ? '사용자 정보 수정' : '신규 사용자 등록'}</h3>
                            <button onClick={() => setIsUserModalOpen(false)}><X size={20}/></button>
                        </div>
                        <div className="p-6 lg:p-8 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">User ID {editingUser && '(ReadOnly)'}</label>
                                <input 
                                    type="text" 
                                    value={userFormData.usrId} 
                                    readOnly={!!editingUser} 
                                    placeholder="아이디를 입력하세요"
                                    onChange={(e) => setUserFormData({...userFormData, usrId: e.target.value})} 
                                    className={classNames("w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono", editingUser ? "text-slate-400" : "text-white")} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">User Name</label>
                                <input type="text" value={userFormData.usrName} onChange={(e) => setUserFormData({...userFormData, usrName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-black" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">{editingUser ? 'Change Password (Option)' : 'Password'}</label>
                                <input 
                                    type="password" 
                                    value={userFormData.password} 
                                    placeholder={editingUser ? "변경 시에만 입력하세요" : "비밀번호를 입력하세요"} 
                                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})} 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Role</label>
                                    <select value={userFormData.role} onChange={(e) => setUserFormData({...userFormData, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-bold">
                                        <option value="USER">USER</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-slate-500 uppercase">Status</label>
                                    <select value={userFormData.useyn} onChange={(e) => setUserFormData({...userFormData, useyn: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none font-bold">
                                        <option value="Y">ACTIVE</option>
                                        <option value="N">BLOCKED</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Email</label>
                                <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Phone</label>
                                <input type="text" value={userFormData.phoneNumber} onChange={(e) => setUserFormData({...userFormData, phoneNumber: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white" />
                            </div>
                        </div>
                        <div className="p-5 bg-slate-850 flex gap-3"><button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">취소</button><button onClick={handleSaveUser} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"><Save size={16} /> 저장</button></div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}></div>
                    <div className="relative w-full max-sm bg-slate-900 border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center"><AlertCircle className="text-rose-500" size={24} /></div>
                            <div><h3 className="text-lg font-black text-white mb-1">삭제 확인</h3><p className="text-slate-400 text-xs">[{deleteTarget.stockName}] 종목을 삭제할까요?</p></div>
                        </div>
                        <div className="p-5 bg-slate-850 flex gap-3"><button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs">아니오</button><button onClick={confirmDelete} className="flex-1 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"><Trash2 size={16} /> 삭제</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSystemManagement;
