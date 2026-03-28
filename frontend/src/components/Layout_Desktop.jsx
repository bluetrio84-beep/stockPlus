import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, BarChart2, Home, Sparkles, Tag, LogOut, Menu, X, Settings, LayoutDashboard, Brain, PieChart, Award, Activity, Newspaper, Book, ShieldAlert, Palette, ChevronRight, ChevronDown } from 'lucide-react';
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
        <div className="flex flex-col h-[100dvh] bg-[var(--theme-bg)] text-[var(--theme-text)] font-sans overflow-hidden select-none transition-colors duration-500">
            <header className="h-14 bg-[var(--theme-header)] border-b border-[var(--theme-border)] flex items-center justify-between px-6 shrink-0 z-40 shadow-md transition-colors duration-500">
                <div className="flex items-center gap-4 transition-colors">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 text-slate-500 hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)]/80 rounded-full transition-all">
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <div className="flex items-center gap-2.5 cursor-pointer group transition-colors" onClick={() => navigate('/')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-[var(--theme-point)] to-[var(--theme-sub-point)] bg-clip-text text-transparent tracking-tight transition-colors">StockPlus</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative transition-colors">
                    {isAdmin() && (
                        <button 
                            onClick={() => navigate('/admin/my-dashboard')} 
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-point)]/10 hover:bg-[var(--theme-point)]/20 border border-[var(--theme-point)]/30 text-[var(--theme-point)] transition-all shadow-lg active:scale-95 group transition-colors"
                        >
                            <PieChart size={16} className="group-hover:rotate-12 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest transition-colors">My-Dashboard</span>
                        </button>
                    )}
                    <button onClick={handleUserMenuToggle} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-bg)] hover:bg-slate-700/20 border border-[var(--theme-border)] transition-all shadow-sm transition-colors">
                        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-xs font-black text-white">{usrName.charAt(0).toUpperCase()}</div>
                        <span className="text-xs font-black text-[var(--theme-text)] opacity-90 transition-colors">{usrName}님</span>
                    </button>
                    <button onClick={handleNotificationToggle} className="p-2 text-slate-500 hover:text-[var(--theme-text)] relative group transition-colors">
                        <Bell size={22} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--theme-header)] animate-pulse"></span>}
                    </button>

                    {logic.isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => logic.setIsNotificationOpen(false)}></div>
                            <div className="absolute top-12 right-4 z-50 w-80 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/50 transition-colors">
                                <div className="p-4 border-b border-[var(--theme-border)] bg-[var(--theme-header)] opacity-95 flex justify-between items-center transition-colors">
                                    <h3 className="text-sm font-black text-[var(--theme-text)] flex items-center gap-2 transition-colors">최신 알림</h3>
                                    <button onClick={() => logic.setIsNotificationOpen(false)}><X size={18} className="text-slate-500 hover:text-[var(--theme-text)] transition-colors" /></button>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto custom-scrollbar bg-[var(--theme-header)] transition-colors">
                                    {logic.notifications.length > 0 ? (
                                        logic.notifications.map((notif, idx) => {
                                            const date = notif.createdAt ? new Date(notif.createdAt) : (notif.timestamp ? new Date(notif.timestamp) : null);
                                            const timeStr = date && !isNaN(date) 
                                                ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                                                : '';
                                            return (
                                                <div key={idx} className="py-3 px-4 border-b border-[var(--theme-border)]/50 hover:bg-[var(--theme-bg)]/50 transition-colors cursor-pointer group transition-colors">
                                                    <div className="flex gap-3 items-start text-[var(--theme-text)] transition-colors">
                                                        <div className={classNames("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 transition-colors", (notif.is_read === 0 || !notif.isRead) ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-slate-500/30")}></div>
                                                        <div className="flex-1 transition-colors">
                                                            <p className={classNames("text-[13px] leading-relaxed mb-1 transition-colors", (notif.is_read === 0 || !notif.isRead) ? "font-black" : "font-bold opacity-80")}>{notif.message}</p>
                                                            <span className="text-[11px] text-slate-500 font-mono font-black block transition-colors">{timeStr}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-16 text-center text-slate-500 text-sm font-black flex flex-col items-center gap-3 transition-colors">
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
                            <div className="absolute top-12 right-0 z-50 w-56 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 transition-colors">
                                <div className="p-5 flex flex-col items-center border-b border-[var(--theme-border)] bg-[var(--theme-header)] opacity-95 transition-colors">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-black text-white mb-2 shadow-lg transition-colors">{usrName.charAt(0).toUpperCase()}</div>
                                    <p className="text-sm font-black text-[var(--theme-text)] transition-colors">안녕하세요, <span className="text-[var(--theme-point)]">{usrName}</span>님</p>
                                </div>
                                <div className="p-2 bg-[var(--theme-header)] transition-colors">
                                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-black text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-95 transition-colors"><LogOut size={16} />로그아웃</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative transition-colors duration-500">
                <aside className={classNames("bg-[var(--theme-header)] border-r border-[var(--theme-border)] flex flex-col shrink-0 transition-all duration-300 ease-in-out z-30 shadow-xl transition-colors", isMenuOpen ? "w-64 opacity-100 p-4 overflow-visible" : "w-0 opacity-0 p-0 border-none overflow-hidden")}>
                    <div className="px-2 py-3 mb-4 whitespace-nowrap transition-colors"><span className="text-[10px] font-black text-[var(--theme-text)] opacity-60 uppercase tracking-[0.2em] transition-colors">Navigation</span></div>
                    <nav className="flex-1 flex flex-col min-w-[224px] transition-colors">
                        <div className="space-y-1.5 flex-1 transition-colors">
                            {navItems.filter(item => !['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button key={item.path} onClick={() => navigate(item.path)} className={classNames("w-full text-left px-4 py-3.5 text-sm flex items-center gap-4 font-black rounded-xl transition-all duration-200 transition-colors", isActive ? "text-white bg-[var(--theme-point)] shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]")}>
                                        <item.icon size={18} className={classNames(isActive ? "text-white" : "text-slate-500")} />{item.name}
                                    </button>
                                );
                            })}
                        </div>

                        {isAdmin() && (
                            <div className="mt-4 pt-4 border-t border-[var(--theme-border)]/60 space-y-1.5 transition-colors">
                                <div className="px-2 pb-2 transition-colors"><span className="text-[9px] font-black text-[var(--theme-text)] opacity-60 uppercase tracking-[0.2em] transition-colors">Management</span></div>
                                {navItems.filter(item => ['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button key={item.path} onClick={() => navigate(item.path)} className={classNames("w-full text-left px-4 py-3 text-xs flex items-center gap-4 font-black rounded-xl transition-all duration-200 transition-colors", isActive ? "text-[var(--theme-point)] bg-[var(--theme-point)]/10 border border-[var(--theme-point)]/20" : "text-slate-500 hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]")}>
                                            <item.icon size={16} className={classNames(isActive ? "text-[var(--theme-point)]" : "text-slate-500")} />{item.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </nav>

                    {/* [v14.5] 테마 스위처: 우측 플라이아웃 탭 스타일 (UI 프리미엄 최적화) */}
                    <div className="mt-auto pt-2 border-t border-[var(--theme-border)]/60 relative transition-colors duration-500">
                        <button 
                            onClick={() => logic.setIsThemeOpen(!logic.isThemeOpen)}
                            className={classNames("w-full text-left px-4 py-2 text-xs flex items-center justify-between font-black rounded-xl transition-all duration-200", logic.isThemeOpen ? "text-[var(--theme-point)] bg-[var(--theme-point)]/5" : "text-slate-500 hover:text-[var(--theme-text)]")}
                        >
                            <div className="flex items-center gap-4">
                                <Palette size={16} className={classNames(logic.isThemeOpen ? "text-[var(--theme-point)]" : "text-slate-500")} />
                                <span className="uppercase tracking-widest">Style Theme</span>
                            </div>
                            <ChevronRight size={14} className={classNames("transition-transform duration-300", logic.isThemeOpen ? "rotate-180" : "")} />
                        </button>

                        {/* 우측으로 튀어나오는 미니 탭 */}
                        {logic.isThemeOpen && (
                            <div className="absolute left-[calc(100%+10px)] bottom-0 w-12 p-1 bg-[var(--theme-header)]/95 backdrop-blur-md border border-[var(--theme-border)] rounded-xl shadow-2xl animate-in slide-in-from-left-2 duration-200 z-[60] flex flex-col gap-2 items-center transition-colors">
                                {[
                                    { id: 'midnight', color: 'bg-[#020617]', name: 'Mid' },
                                    { id: 'pure-white', color: 'bg-[#ffffff]', name: 'Wht' },
                                    { id: 'pitch-black', color: 'bg-[#000000]', name: 'Blk' }
                                ].map(t => (
                                    <button 
                                        key={t.id} 
                                        onClick={() => logic.setTheme(t.id)}
                                        className={classNames(
                                            "group flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all active:scale-90",
                                            logic.theme === t.id ? "opacity-100" : "opacity-40 hover:opacity-100"
                                        )}
                                    >
                                        <div className={classNames(
                                            "w-6 h-6 rounded-full border border-[var(--theme-border)] shadow-sm",
                                            t.color,
                                            logic.theme === t.id ? "border-indigo-400 scale-110 ring-2 ring-indigo-400/20" : ""
                                        )}></div>
                                        <span className="text-[6px] font-black text-slate-500 uppercase">{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                <div className="flex-1 flex flex-col min-0 bg-[var(--theme-bg)] relative transition-colors duration-500">
                    <div className="bg-[var(--theme-header)] opacity-95 border-b border-[var(--theme-border)] px-6 py-2 flex items-center gap-8 overflow-hidden shrink-0 transition-colors duration-500">
                        <div className="flex gap-8 shrink-0 transition-colors">
                            {marketIndices.map(index => (
                                <div key={index.name} className="flex items-center gap-2 whitespace-nowrap min-w-fit transition-colors">
                                    <span className="text-xs font-black text-slate-500 transition-colors">{index.name}</span>
                                    <span className="text-sm font-bold font-mono text-[var(--theme-text)] transition-colors">{parseFloat(index.price || 0).toLocaleString()}</span>
                                    <span className={classNames("text-[10px] font-bold font-mono transition-colors", { "text-trade-up": parseFloat(index.change) > 0, "text-trade-down": parseFloat(index.change) < 0, "text-slate-500": parseFloat(index.change) === 0 })}>
                                        {parseFloat(index.change) > 0 ? '▲' : (parseFloat(index.change) < 0 ? '▼' : '')} {Math.abs(parseFloat(index.change || 0)).toFixed(2)} ({index.rate}%)
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <main className="flex-1 overflow-hidden relative transition-colors"><Outlet /></main>
                </div>
            </div>
        </div>
    );
};

export default LayoutDesktop;
