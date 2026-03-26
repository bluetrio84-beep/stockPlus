import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Menu, BarChart2, Home, X, Sparkles, Tag, LogOut, Settings, LayoutDashboard, Award, Activity, Newspaper, Book, ShieldAlert, Palette } from 'lucide-react';
import classNames from 'classnames';
import { isAdmin } from '../api/authApi';

const LayoutMobile = ({ logic }) => {
    const { 
        navigate, location, isMenuOpen, setIsMenuOpen, marketIndices, 
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

    const handleNotificationClick = (notif) => {
        const msg = notif.message || "";
        if (msg.includes("시장 요약")) {
            navigate('/');
        } else if (msg.includes("전담 AI 분석가")) {
            navigate('/summary?tab=ai');
        } else if (msg.includes("외인 집중 수급")) {
            navigate('/admin/intel');
        }
        logic.setIsNotificationOpen(false);
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans overflow-hidden select-none transition-colors duration-500">
            <header className="h-14 bg-[var(--theme-header)] border-b border-[var(--theme-border)] flex items-center justify-between px-4 sticky top-0 z-40 relative shadow-lg transition-colors duration-500">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 text-slate-400 active:bg-slate-800 rounded-full transition-colors">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">StockPlus</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 relative">
                    {isAdmin() && (
                        <button 
                            onClick={() => navigate('/admin/my-dashboard')} 
                            className="p-2 text-indigo-400 bg-indigo-600/10 rounded-lg border border-indigo-500/20 active:scale-90 transition-all shadow-md"
                        >
                            <LayoutDashboard size={18} />
                        </button>
                    )}
                    <button onClick={handleUserMenuToggle} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 mr-1 shadow-sm active:bg-slate-700">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white">{usrName.charAt(0).toUpperCase()}</div>
                        <span className="text-[11px] font-bold text-slate-300 max-w-[60px] truncate">{usrName}님</span>
                    </button>
                    <button onClick={handleNotificationToggle} className="p-2 text-slate-400 relative"><Bell size={20} />{unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}</button>
                    {logic.isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => logic.setIsNotificationOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-[calc(100vw-32px)] max-w-[300px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-white">최신 알림</h3>
                                    <button onClick={() => logic.setIsNotificationOpen(false)}><X size={18} className="text-slate-500" /></button>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto no-scrollbar bg-slate-900">
                                    {logic.notifications.length > 0 ? logic.notifications.map((notif, idx) => {
                                        const date = notif.createdAt ? new Date(notif.createdAt) : (notif.timestamp ? new Date(notif.timestamp) : null);
                                        const timeStr = date && !isNaN(date) ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}` : '';
                                        return (
                                            <div key={idx} onClick={() => handleNotificationClick(notif)} className="py-2.5 px-4 border-b border-slate-800/50 active:bg-slate-800 transition-colors cursor-pointer hover:bg-slate-800/50">
                                                <div className="flex gap-3 items-start text-white">
                                                    <div className={classNames("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", (notif.is_read === 0 || !notif.isRead) ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-slate-700")}></div>
                                                    <div className="flex-1">
                                                        <p className="text-[11px] font-bold leading-normal mb-1">{notif.message}</p>
                                                        <span className="text-[10px] text-white/60 font-mono block">{timeStr}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : <div className="p-10 text-center text-white text-xs font-bold flex flex-col items-center gap-2"><Bell size={24} className="opacity-20 mb-1" />새로운 알림이 없습니다.</div>}
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
                                <div className="p-2 bg-slate-900"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"><LogOut size={16} />로그아웃</button></div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="bg-[var(--theme-header)] opacity-95 border-b border-[var(--theme-border)] px-4 py-1.5 shrink-0 overflow-hidden transition-colors duration-500">
                <div className="flex items-center justify-start gap-5">
                    {marketIndices.map(index => (
                        <div key={index.name} className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500">{index.name}</span>
                            <span className="text-[11px] font-bold font-mono text-slate-200">{parseFloat(index.price || 0).toLocaleString()}</span>
                            <span className={classNames("text-[9px] font-bold font-mono flex items-center gap-0.5", { "text-trade-up": parseFloat(index.change) > 0, "text-trade-down": parseFloat(index.change) < 0, "text-slate-500": parseFloat(index.change) === 0 })}>
                                {parseFloat(index.change) > 0 ? '▲' : (parseFloat(index.change) < 0 ? '▼' : '')} {Math.abs(parseFloat(index.change || 0)).toFixed(2)} ({index.rate}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-[var(--theme-header)] shadow-2xl py-4 animate-in slide-in-from-left duration-200 border-r border-[var(--theme-border)] flex flex-col transition-colors duration-500">
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-800 mb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation</span>
                            <button onClick={() => setIsMenuOpen(false)}><X size={20} className="text-slate-500" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-8">
                            <div className="space-y-1.5">
                                {navItems.filter(item => !['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button key={item.path} onClick={() => { navigate(item.path); setIsMenuOpen(false); }} className={classNames("w-full text-left px-4 py-3 text-sm flex items-center gap-4 font-bold rounded-xl transition-all", isActive ? "text-white bg-indigo-600 shadow-lg shadow-indigo-600/20" : "text-slate-400 active:bg-slate-800")}>
                                            <item.icon size={18} className={isActive ? "text-white" : "text-slate-500"} />{item.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {isAdmin() && (
                                <div className="mt-10 pt-8 border-t border-slate-800/60 space-y-1.5">
                                    <div className="px-4 pb-2"><span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Management</span></div>
                                    {navItems.filter(item => ['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <button key={item.path} onClick={() => { navigate(item.path); setIsMenuOpen(false); }} className={classNames("w-full text-left px-4 py-3 text-sm flex items-center gap-4 font-bold rounded-xl transition-all", isActive ? "text-white bg-rose-600 shadow-lg shadow-rose-600/20" : "text-slate-400 active:bg-slate-800")}>
                                                <item.icon size={18} className={isActive ? "text-white" : "text-slate-500"} />{item.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <main className="flex-1 overflow-hidden relative pb-4"><Outlet /></main>

            {/* [v52.5] 네이버 스타일 테마 스위처 (Mobile Floating) */}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
                {logic.isThemeOpen && (
                    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-white/10 flex flex-col gap-4">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Style Theme</div>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'midnight', color: 'bg-[#020617]', name: 'Midnight' },
                                { id: 'pure-white', color: 'bg-[#ffffff]', name: 'White' },
                                { id: 'pitch-black', color: 'bg-[#000000]', name: 'Black' },
                                { id: 'forest-green', color: 'bg-[#064e3b]', name: 'Forest' },
                                { id: 'royal-wine', color: 'bg-[#450a0a]', name: 'Wine' },
                                { id: 'deep-ocean', color: 'bg-[#0c4a6e]', name: 'Ocean' }
                            ].map(t => (
                                <button 
                                    key={t.id} 
                                    onClick={() => logic.setTheme(t.id)}
                                    className={classNames(
                                        "group flex flex-col items-center gap-1.5 active:scale-90 transition-all",
                                        logic.theme === t.id ? "opacity-100" : "opacity-60"
                                    )}
                                >
                                    <div className={classNames(
                                        "w-10 h-10 rounded-full border-2 transition-all shadow-lg",
                                        t.color,
                                        logic.theme === t.id ? "border-indigo-400 scale-110 ring-4 ring-indigo-400/20" : "border-slate-700"
                                    )}></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{t.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <button 
                    onClick={() => logic.setIsThemeOpen(!logic.isThemeOpen)}
                    className={classNames(
                        "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 relative overflow-hidden border border-white/10",
                        logic.isThemeOpen ? "bg-indigo-600 rotate-90" : "bg-slate-800"
                    )}
                >
                    <Palette size={20} className={classNames("transition-colors", logic.isThemeOpen ? "text-white" : "text-indigo-400")} />
                    {!logic.isThemeOpen && <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-slate-900 text-[7px] font-black flex items-center justify-center text-white animate-bounce">6</span>}
                </button>
            </div>
        </div>
    );
};

export default LayoutMobile;
