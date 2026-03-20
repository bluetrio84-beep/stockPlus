import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, BarChart2, Home, Sparkles, Tag, LogOut, Menu, X, Settings, LayoutDashboard, Brain, PieChart, Award, Activity, Newspaper, Book, ShieldAlert } from 'lucide-react';
import classNames from 'classnames';
import { isAdmin } from '../api/authApi';

const LayoutDesktop = ({ logic }) => {
    const { 
        navigate, location, isMenuOpen, setIsMenuOpen, marketIndices, rankings, 
        unreadCount, isUserMenuOpen, setIsUserMenuOpen, usrName, 
        handleNotificationToggle, handleUserMenuToggle, handleLogout 
    } = logic;

    const navItems = [
        { name: '대시보드', path: '/', icon: Home },
        { name: '관심종목 요약', path: '/summary', icon: Sparkles },
        { name: 'AI 키워드 관리', path: '/keywords', icon: Tag },
        { name: '투자 일지', path: '/notes', icon: Book },
    ];

    if (isAdmin()) {
        navItems.push({ name: 'ADMIN 대시보드', path: '/admin/intel', icon: LayoutDashboard });
        navItems.push({ name: 'DAILY 매거진', path: '/admin/magazine', icon: Newspaper });
        navItems.push({ name: 'NEXT LEADERS', path: '/admin/next-leaders', icon: Award });
        navItems.push({ name: 'MARKET BUBBLE CHART', path: '/admin/chart', icon: BarChart2 });
        navItems.push({ name: 'SMART MONEY', path: '/admin/smart-money', icon: Sparkles });
        navItems.push({ name: '데이터 수집 관리', path: '/admin', icon: Activity });
        navItems.push({ name: '장애 관리', path: '/admin/failure', icon: ShieldAlert });
        navItems.push({ name: '시스템 관리', path: '/admin/system', icon: Settings });
    }

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
            <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-40 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">StockPlus</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative">
                    {isAdmin() && (
                        <button 
                            onClick={() => navigate('/admin/my-dashboard')} 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 transition-all shadow-lg active:scale-95 group"
                        >
                            <PieChart size={16} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">My-Dashboard</span>
                        </button>
                    )}
                    <button onClick={handleUserMenuToggle} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shadow-sm">
                        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-xs font-black text-white">{usrName.charAt(0).toUpperCase()}</div>
                        <span className="text-xs font-bold text-slate-300">{usrName}님</span>
                    </button>
                    <button onClick={handleNotificationToggle} className="p-2 text-slate-400 hover:text-white relative group">
                        <Bell size={22} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
                    </button>

                    {logic.isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => logic.setIsNotificationOpen(false)}></div>
                            <div className="absolute top-12 right-4 z-50 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/50">
                                <div className="p-4 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">최신 알림</h3>
                                    <button onClick={() => logic.setIsNotificationOpen(false)}><X size={18} className="text-slate-500 hover:text-white transition-colors" /></button>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto custom-scrollbar bg-slate-900">
                                    {logic.notifications.length > 0 ? (
                                        logic.notifications.map((notif, idx) => {
                                            const date = notif.createdAt ? new Date(notif.createdAt) : (notif.timestamp ? new Date(notif.timestamp) : null);
                                            const timeStr = date && !isNaN(date) 
                                                ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                                                : '';
                                            return (
                                                <div key={idx} className="py-3 px-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                                                    <div className="flex gap-3 items-start text-white">
                                                        <div className={classNames("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 transition-colors", (notif.is_read === 0 || !notif.isRead) ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-slate-600")}></div>
                                                        <div className="flex-1">
                                                            <p className={classNames("text-[13px] leading-relaxed mb-1", (notif.is_read === 0 || !notif.isRead) ? "font-bold" : "font-medium opacity-90")}>{notif.message}</p>
                                                            <span className="text-[11px] text-white/60 font-mono block">{timeStr}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-16 text-center text-white text-sm font-bold flex flex-col items-center gap-3">
                                            <Bell size={32} className="opacity-20 mb-1" />
                                            새로운 알림이 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {isUserMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-5 flex flex-col items-center border-b border-slate-800 bg-slate-850">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-black text-white mb-2 shadow-lg">{usrName.charAt(0).toUpperCase()}</div>
                                    <p className="text-sm font-bold text-white">안녕하세요, <span className="text-indigo-400">{usrName}</span>님</p>
                                </div>
                                <div className="p-2 bg-slate-900">
                                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"><LogOut size={16} />로그아웃</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                <aside className={classNames("bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30 shadow-xl", isMenuOpen ? "w-64 opacity-100 p-4" : "w-0 opacity-0 p-0 border-none")}>
                    <div className="px-2 py-3 mb-4 whitespace-nowrap"><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation</span></div>
                    <nav className="flex-1 flex flex-col min-w-[224px]">
                        <div className="space-y-1.5 flex-1">
                            {navItems.filter(item => !['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button key={item.path} onClick={() => navigate(item.path)} className={classNames("w-full text-left px-4 py-3.5 text-sm flex items-center gap-4 font-bold rounded-xl transition-all duration-200", isActive ? "text-white bg-indigo-600 shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                                        <item.icon size={18} className={classNames(isActive ? "text-white" : "text-slate-500")} />{item.name}
                                    </button>
                                );
                            })}
                        </div>

                        {isAdmin() && (
                            <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-1.5">
                                <div className="px-2 pb-2"><span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Management</span></div>
                                {navItems.filter(item => ['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button key={item.path} onClick={() => navigate(item.path)} className={classNames("w-full text-left px-4 py-3 text-xs flex items-center gap-4 font-bold rounded-xl transition-all duration-200", isActive ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300")}>
                                            <item.icon size={16} className={classNames(isActive ? "text-indigo-400" : "text-slate-600")} />{item.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </nav>
                </aside>

                <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
                    <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-2 flex items-center gap-8 overflow-hidden shrink-0">
                        <div className="flex gap-8 shrink-0">
                            {marketIndices.map(index => (
                                <div key={index.name} className="flex items-center gap-2 whitespace-nowrap min-w-fit">
                                    <span className="text-xs font-black text-slate-500">{index.name}</span>
                                    <span className="text-sm font-bold font-mono text-slate-200">{parseFloat(index.price || 0).toLocaleString()}</span>
                                    <span className={classNames("text-[10px] font-bold font-mono", { "text-trade-up": parseFloat(index.change) > 0, "text-trade-down": parseFloat(index.change) < 0, "text-slate-500": parseFloat(index.change) === 0 })}>
                                        {parseFloat(index.change) > 0 ? '▲' : (parseFloat(index.change) < 0 ? '▼' : '')} {Math.abs(parseFloat(index.change || 0)).toFixed(2)} ({index.rate}%)
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* [v13.5] Live Ranking 섹션 제거 (주석 처리)
                        {rankings && rankings.length > 0 && (
                            <div className="flex items-center gap-6 overflow-hidden border-l border-slate-800 pl-8 ml-2">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter shrink-0 animate-pulse">Live Ranking</span>
                                <div className="flex gap-6 overflow-x-auto no-scrollbar py-1">
                                    {rankings.map((r, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => navigate(`/stock/${r.stock_code}`)} 
                                            className="flex items-center gap-1.5 whitespace-nowrap group hover:bg-slate-800/50 px-2 py-0.5 rounded-md transition-all"
                                        >
                                            <span className={classNames("text-[10px] font-black", r.type === 'AMOUNT' ? "text-amber-500" : "text-rose-500")}>
                                                {r.type === 'AMOUNT' ? '●' : '▲'}
                                            </span>
                                            <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{r.stock_name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        */}
                    </div>
                    <main className="flex-1 overflow-hidden relative"><Outlet /></main>
                </div>
            </div>
        </div>
    );
};

export default LayoutDesktop;
