import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bell, Menu, BarChart2, Sparkles, Home, LogOut, User as UserIcon, X } from 'lucide-react';
import classNames from 'classnames';
import { fetchStockPrice, getAuthHeader } from '../api/stockApi';

const Layout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [marketIndices, setMarketIndices] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    const notificationRef = useRef(null);
    const profileRef = useRef(null);

    const usrName = localStorage.getItem('usrName') || '사용자';

    // 1. 지수 데이터 로드 (원본 유지)
    const loadMarketIndices = useCallback(async () => {
        try {
            const [kospi, kosdaq] = await Promise.all([
                fetchStockPrice('0001', 'IDX'),
                fetchStockPrice('1001', 'IDX')
            ]);
            
            setMarketIndices([
                { name: 'KOSPI', price: kospi?.currentPrice || '0', change: kospi?.change || '0', rate: kospi?.changeRate || '0' },
                { name: 'KOSDAQ', price: kosdaq?.currentPrice || '0', change: kosdaq?.change || '0', rate: kosdaq?.changeRate || '0' }
            ]);
        } catch (error) {}
    }, []);

    // 2. 알림 데이터 로드 (기능 업그레이드)
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/stockPlus/api/notifications', { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
            const countRes = await fetch('/stockPlus/api/notifications/unread-count', { headers: getAuthHeader() });
            if (countRes.ok) {
                const count = await countRes.json();
                setUnreadCount(count);
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        loadMarketIndices();
        fetchNotifications();
        const interval = setInterval(() => {
            loadMarketIndices();
            fetchNotifications();
        }, 30000); 
        return () => clearInterval(interval);
    }, [loadMarketIndices, fetchNotifications]);

    const handleNotificationToggle = async () => {
        setIsNotificationOpen(!isNotificationOpen);
        setIsUserMenuOpen(false);
        if (!isNotificationOpen && unreadCount > 0) {
            setUnreadCount(0);
            await fetch('/stockPlus/api/notifications/read', { method: 'POST', headers: getAuthHeader() });
        }
    };

    const handleUserMenuToggle = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
        setIsNotificationOpen(false);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
            {/* Header - [복구] 원본 디자인 */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-40 relative shadow-lg">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">StockPlus</span>
                    </div>
                </div>

                {/* Left Drawer Menu */}
                {isMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute top-14 left-4 z-50 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-3 animate-in slide-in-from-left-5 duration-200">
                            <div className="px-5 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 mb-2">메뉴</div>
                            <button onClick={() => { navigate('/'); setIsMenuOpen(false); }} className={classNames("w-full text-left px-5 py-3 text-sm transition-colors flex items-center gap-3 font-bold", { "text-indigo-400 bg-indigo-500/10": location.pathname === '/', "text-slate-300 hover:bg-slate-800": location.pathname !== '/' })}><Home size={18} />대시보드</button>
                            <button onClick={() => { navigate('/summary'); setIsMenuOpen(false); }} className={classNames("w-full text-left px-5 py-3 text-sm transition-colors flex items-center gap-3 font-bold", { "text-indigo-400 bg-indigo-500/10": location.pathname === '/summary', "text-slate-300 hover:bg-slate-800": location.pathname !== '/summary' })}><Sparkles size={18} />관심종목 요약</button>
                        </div>
                    </>
                )}

                <div className="flex items-center gap-1.5 relative">
                    {/* User Info Button (Original Style) */}
                    <button 
                        onClick={handleUserMenuToggle}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors mr-1 shadow-sm"
                    >
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white">
                            {usrName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] md:text-xs font-bold text-slate-300 max-w-[60px] md:max-w-none truncate">{usrName}님</span>
                    </button>

                    {/* Notification Bell (Upgraded) */}
                    <button onClick={handleNotificationToggle} className="p-2 text-slate-400 hover:text-white transition-colors relative group">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
                    </button>

                    {/* User Profile Menu (Original Design Restored) */}
                    {isUserMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-5 flex flex-col items-center border-b border-slate-800">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-indigo-600/20 mb-3">
                                        {usrName.charAt(0).toUpperCase()}
                                    </div>
                                    <p className="text-sm font-bold text-white whitespace-nowrap">
                                        안녕하세요, <span className="text-indigo-400 font-black">{usrName}</span>님
                                    </p>
                                </div>
                                <div className="p-2 bg-slate-900">
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <LogOut size={16} />
                                        로그아웃
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Notification Dropdown (Restored & Upgraded) */}
                    {isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsNotificationOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-72 md:w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-300">시스템 알림 센터</span>
                                    <button onClick={() => setIsNotificationOpen(false)}><X size={14} className="text-slate-500 hover:text-white" /></button>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.length > 0 ? notifications.map((n) => (
                                        <div key={n.id} className="p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => setIsNotificationOpen(false)}>
                                            <p className="text-xs text-slate-200 leading-snug">{n.message}</p>
                                            <p className="text-[10px] text-slate-500 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
                                        </div>
                                    )) : <div className="p-10 text-center text-xs text-slate-500 font-medium">새로운 알림이 없습니다.</div>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            {/* Market Indices Bar - [복구] 지수 바 */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex gap-6 overflow-x-auto no-scrollbar shrink-0">
                {marketIndices.map(index => (
                    <div key={index.name} className="flex items-center gap-2 whitespace-nowrap min-w-fit">
                        <span className="text-xs font-bold text-slate-400">{index.name}</span>
                        <span className="text-sm font-bold font-mono text-slate-200">{parseFloat(index.price || 0).toLocaleString()}</span>
                        <span className={classNames("text-[10px] font-bold font-mono", {
                            "text-trade-up": parseFloat(index.change) > 0,
                            "text-trade-down": parseFloat(index.change) < 0,
                            "text-slate-500": parseFloat(index.change) === 0
                        })}>
                            {parseFloat(index.change) > 0 ? '▲' : (parseFloat(index.change) < 0 ? '▼' : '')} {Math.abs(parseFloat(index.change || 0)).toFixed(2)} ({index.rate}%)
                        </span>
                    </div>
                ))}
            </div>

            {/* Main Content Area - Outlet 복구 */}
            <main className="flex-1 overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;