import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Menu, BarChart2, Home, X, Sparkles, Tag, LogOut, Settings, LayoutDashboard, Award, Activity, Newspaper, Book, ShieldAlert, Palette, ChevronRight, PieChart } from 'lucide-react';
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
        navItems.push({ name: 'AI 사용량 관리', path: '/admin/ai-usage', icon: PieChart });
        navItems.push({ name: '시스템 관리', path: '/admin/system', icon: Settings });
    }

    const handleNotificationClick = (notif) => {
        const msg = notif.message || "";
        if (msg.includes("시장 요약")) navigate('/');
        else if (msg.includes("전담 AI 분석가")) navigate('/summary?tab=ai');
        else if (msg.includes("외인 집중 수급")) navigate('/admin/intel');
        logic.setIsNotificationOpen(false);
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans overflow-hidden select-none transition-colors duration-500">
            <header className="h-14 bg-[var(--theme-header)] border-b border-[var(--theme-border)] flex items-center justify-between px-4 sticky top-0 z-40 shadow-lg transition-colors duration-500">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 text-slate-500 active:bg-[var(--theme-bg)] rounded-full transition-colors">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-[var(--theme-point)] to-[var(--theme-sub-point)] bg-clip-text text-transparent tracking-tight">StockPlus</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 relative">
                    {isAdmin() && (
                        <button onClick={() => navigate('/admin/my-dashboard')} className="p-2 text-[var(--theme-point)] bg-[var(--theme-point)]/10 rounded-lg border border-[var(--theme-point)]/20 active:scale-90 transition-all shadow-md">
                            <LayoutDashboard size={18} />
                        </button>
                    )}
                    <button onClick={handleUserMenuToggle} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] mr-1 shadow-sm active:bg-slate-700/20 transition-colors">
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white shadow-sm">{usrName.charAt(0).toUpperCase()}</div>
                        <span className="text-[11px] font-black text-[var(--theme-text)] max-w-[60px] truncate transition-colors">{usrName}님</span>
                    </button>
                    <button onClick={handleNotificationToggle} className="p-2 text-slate-500 hover:text-[var(--theme-text)] relative transition-colors">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--theme-header)] animate-pulse"></span>}
                    </button>
                    
                    {logic.isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => logic.setIsNotificationOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-[calc(100vw-32px)] max-w-[300px] bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 transition-colors">
                                <div className="p-4 border-b border-[var(--theme-border)] bg-[var(--theme-header)] opacity-95 flex justify-between items-center transition-colors">
                                    <h3 className="text-sm font-black text-[var(--theme-text)] transition-colors">최신 알림</h3>
                                    <button onClick={() => logic.setIsNotificationOpen(false)}><X size={18} className="text-slate-500" /></button>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto no-scrollbar bg-[var(--theme-header)] transition-colors">
                                    {logic.notifications.length > 0 ? logic.notifications.map((notif, idx) => {
                                        const date = notif.createdAt ? new Date(notif.createdAt) : (notif.timestamp ? new Date(notif.timestamp) : null);
                                        const timeStr = date && !isNaN(date) ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}` : '';
                                        return (
                                            <div key={idx} onClick={() => handleNotificationClick(notif)} className="py-2.5 px-4 border-b border-[var(--theme-border)]/50 active:bg-[var(--theme-bg)] transition-colors cursor-pointer hover:bg-[var(--theme-bg)]/50 transition-colors">
                                                <div className="flex gap-3 items-start transition-colors text-[var(--theme-text)]">
                                                    <div className={classNames("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", (notif.is_read === 0 || !notif.isRead) ? "bg-[var(--theme-point)] shadow-[0_0_8px_var(--theme-point)]" : "bg-slate-500/30")}></div>
                                                    <div className="flex-1 transition-colors">
                                                        <p className="text-[11px] font-bold leading-normal mb-1 transition-colors">{notif.message}</p>
                                                        <span className="text-[10px] text-slate-500 font-black font-mono block transition-colors">{timeStr}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : <div className="p-10 text-center text-slate-500 text-xs font-black flex flex-col items-center gap-2 transition-colors"><Bell size={24} className="opacity-20 mb-1" />새로운 알림이 없습니다.</div>}
                                </div>
                            </div>
                        </>
                    )}
                    
                    {isUserMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-56 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 transition-colors">
                                <div className="p-5 flex flex-col items-center border-b border-[var(--theme-border)] bg-[var(--theme-header)] transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-black text-white mb-2 shadow-lg transition-colors">{usrName.charAt(0).toUpperCase()}</div>
                                    <p className="text-sm font-black text-[var(--theme-text)] transition-colors">안녕하세요, <span className="text-[var(--theme-point)]">{usrName}</span>님</p>
                                </div>
                                <div className="p-2 bg-[var(--theme-header)] transition-colors"><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95 transition-colors"><LogOut size={16} />로그아웃</button></div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="bg-[var(--theme-header)] opacity-95 border-b border-[var(--theme-border)] px-4 py-1.5 shrink-0 overflow-hidden transition-colors duration-500">
                <div className="flex items-center justify-start gap-5 transition-colors">
                    {marketIndices.map(index => (
                        <div key={index.name} className="flex items-center gap-2 transition-colors">
                            <span className="text-[10px] font-black text-slate-500 uppercase transition-colors">{index.name}</span>
                            <span className="text-[11px] font-black font-mono text-[var(--theme-text)] transition-colors">{parseFloat(index.price || 0).toLocaleString()}</span>
                            <span className={classNames("text-[9px] font-black font-mono flex items-center gap-0.5 transition-colors", { "text-trade-up": parseFloat(index.change) > 0, "text-trade-down": parseFloat(index.change) < 0, "text-slate-500": parseFloat(index.change) === 0 })}>
                                {parseFloat(index.change) > 0 ? '▲' : (parseFloat(index.change) < 0 ? '▼' : '')} {Math.abs(parseFloat(index.change || 0)).toFixed(2)} ({index.rate}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="fixed top-0 left-0 bottom-0 z-60 w-72 bg-[var(--theme-header)] shadow-2xl py-4 animate-in slide-in-from-left duration-200 border-r border-[var(--theme-border)] flex flex-col transition-colors duration-500 overflow-visible">
                        <div className="px-6 py-4 flex justify-between items-center border-b border-[var(--theme-border)] mb-2 shrink-0 transition-colors">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] transition-colors">Navigation</span>
                            <button onClick={() => setIsMenuOpen(false)} className="text-slate-500 hover:text-[var(--theme-text)] transition-colors"><X size={20} /></button>
                        </div>
                        <div className="flex-1 px-3 pb-4 transition-colors">
                            <div className="space-y-1 transition-colors">
                                {navItems.filter(item => !['데이터 수집 관리', '장애 관리', 'AI 사용량 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button key={item.path} onClick={() => { navigate(item.path); setIsMenuOpen(false); }} className={classNames("w-full text-left px-4 py-3 text-sm flex items-center gap-4 font-black rounded-xl transition-all transition-colors", isActive ? "text-white bg-[var(--theme-point)] shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 active:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]")}>
                                            <item.icon size={18} className={classNames(isActive ? "text-white" : "text-slate-500")} />{item.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {isAdmin() && (
                                <div className="mt-1 pt-1 border-t border-[var(--theme-border)]/60 space-y-0.5 transition-colors">
                                    <div className="px-4 pb-1 transition-colors"><span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] transition-colors">Management</span></div>
                                    {navItems.filter(item => ['데이터 수집 관리', '장애 관리', 'AI 사용량 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <button key={item.path} onClick={() => { navigate(item.path); setIsMenuOpen(false); }} className={classNames("w-full text-left px-4 py-2.5 text-sm flex items-center gap-4 font-black rounded-xl transition-all transition-colors", isActive ? "text-white bg-rose-600 shadow-lg shadow-rose-600/20" : "text-slate-500 active:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]")}>
                                                <item.icon size={18} className={isActive ? "text-white" : "text-slate-500"} />{item.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="mt-auto pt-2 border-t border-[var(--theme-border)]/60 relative px-2 pt-2 pb-1 transition-colors duration-500 shrink-0">
                            <button onClick={() => logic.setIsThemeOpen(!logic.isThemeOpen)} className={classNames("w-full text-left px-4 py-2 text-xs flex items-center justify-between font-black rounded-xl transition-all transition-colors", logic.isThemeOpen ? "text-[var(--theme-point)] bg-[var(--theme-point)]/5" : "text-slate-500")}>
                                <div className="flex items-center gap-4 transition-colors"><Palette size={16} className={logic.isThemeOpen ? "text-[var(--theme-point)]" : "text-slate-500"} /><span className="uppercase tracking-widest transition-colors">Style Theme</span></div>
                                <ChevronRight size={14} className={classNames("transition-transform duration-300", logic.isThemeOpen ? "rotate-180" : "")} />
                            </button>
                            {logic.isThemeOpen && (
                                <div className="absolute left-[calc(100%-10px)] bottom-4 w-12 p-1 bg-[var(--theme-header)]/95 backdrop-blur-md border border-[var(--theme-border)] rounded-xl shadow-2xl animate-in slide-in-from-left-2 duration-200 z-[70] flex flex-col gap-2 items-center transition-colors">
                                    {[{ id: 'midnight', color: 'bg-[#020617]', name: 'Mid' }, { id: 'pure-white', color: 'bg-[#ffffff]', name: 'Wht' }, { id: 'pitch-black', color: 'bg-[#000000]', name: 'Blk' }].map(t => (
                                        <button key={t.id} onClick={() => { logic.setTheme(t.id); logic.setIsThemeOpen(false); }} className={classNames("group flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all active:scale-90 transition-colors", logic.theme === t.id ? "opacity-100" : "opacity-40 hover:opacity-100")}>
                                            <div className={classNames("w-6 h-6 rounded-full border border-[var(--theme-border)] shadow-sm transition-colors", t.color, logic.theme === t.id ? "border-indigo-400 ring-2 ring-indigo-400/20" : "")}></div>
                                            <span className="text-[6px] font-black text-slate-500 uppercase transition-colors">{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            <main className="flex-1 overflow-hidden relative pb-4 transition-colors duration-500"><Outlet /></main>
        </div>
    );
};

export default LayoutMobile;
