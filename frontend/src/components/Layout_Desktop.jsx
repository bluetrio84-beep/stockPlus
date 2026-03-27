import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, BarChart2, Home, Sparkles, Tag, LogOut, Menu, X, Settings, LayoutDashboard, Brain, PieChart, Award, Activity, Newspaper, Book, ShieldAlert, Palette } from 'lucide-react';
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
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-[var(--theme-point)] to-[var(--theme-sub-point)] bg-clip-text text-transparent tracking-tight transition-colors">StockPlus</span>
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
                    <button onClick={handleUserMenuToggle} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--theme-bg)] hover:bg-slate-700 border border-[var(--theme-border)] transition-all shadow-sm">
                        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-xs font-black text-white">{usrName.charAt(0).toUpperCase()}</div>
                        <span className="text-xs font-bold text-[var(--theme-text)] opacity-90 transition-colors">{usrName}님</span>
                    </button>
                    <button onClick={handleNotificationToggle} className="p-2 text-slate-400 hover:text-[var(--theme-text)] relative group transition-colors">
                        <Bell size={22} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
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
                <aside className={classNames("bg-[var(--theme-header)] border-r border-[var(--theme-border)] flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30 shadow-xl", isMenuOpen ? "w-64 opacity-100 p-4" : "w-0 opacity-0 p-0 border-none")}>
                    <div className="px-2 py-3 mb-4 whitespace-nowrap"><span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation</span></div>
                    <nav className="flex-1 flex flex-col min-w-[224px]">
                        <div className="space-y-1.5 flex-1">
                            {navItems.filter(item => !['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button key={item.path} onClick={() => navigate(item.path)} className={classNames("w-full text-left px-4 py-3.5 text-sm flex items-center gap-4 font-black rounded-xl transition-all duration-200", isActive ? "text-white bg-[var(--theme-point)] shadow-lg shadow-[var(--theme-point)]/20" : "text-slate-500 hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]")}>
                                        <item.icon size={18} className={classNames(isActive ? "text-white" : "text-slate-500")} />{item.name}
                                    </button>
                                );
                            })}
                        </div>

                        {isAdmin() && (
                            <div className="mt-4 pt-4 border-t border-[var(--theme-border)]/60 space-y-1.5 transition-colors">
                                <div className="px-2 pb-2 transition-colors"><span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] transition-colors">Management</span></div>
                                {navItems.filter(item => ['데이터 수집 관리', '장애 관리', '시스템 관리'].includes(item.name)).map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button key={item.path} onClick={() => navigate(item.path)} className={classNames("w-full text-left px-4 py-3 text-xs flex items-center gap-4 font-black rounded-xl transition-all duration-200", isActive ? "text-[var(--theme-point)] bg-[var(--theme-point)]/10 border border-[var(--theme-point)]/20" : "text-slate-500 hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]")}>
                                            <item.icon size={16} className={classNames(isActive ? "text-[var(--theme-point)]" : "text-slate-500")} />{item.name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </nav>
                </aside>

                <div className="flex-1 flex flex-col min-0 bg-[var(--theme-bg)] relative transition-colors duration-500">
                    <div className="bg-[var(--theme-header)] opacity-95 border-b border-[var(--theme-border)] px-6 py-2 flex items-center gap-8 overflow-hidden shrink-0 transition-colors duration-500">
                        <div className="flex gap-8 shrink-0">
                            {marketIndices.map(index => (
                                <div key={index.name} className="flex items-center gap-2 whitespace-nowrap min-w-fit">
                                    <span className="text-xs font-black text-slate-500">{index.name}</span>
                                    <span className="text-sm font-bold font-mono text-[var(--theme-text)]">{parseFloat(index.price || 0).toLocaleString()}</span>
                                    <span className={classNames("text-[10px] font-bold font-mono", { "text-trade-up": parseFloat(index.change) > 0, "text-trade-down": parseFloat(index.change) < 0, "text-slate-500": parseFloat(index.change) === 0 })}>
                                        {parseFloat(index.change) > 0 ? '▲' : (parseFloat(index.change) < 0 ? '▼' : '')} {Math.abs(parseFloat(index.change || 0)).toFixed(2)} ({index.rate}%)
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* [v13.5] Live Ranking 섹션 제거 (주석 처리)
                        {rankings && rankings.length > 0 && (
                            <div className="flex items-center gap-6 overflow-hidden border-l border-[var(--theme-border)] pl-8 ml-2">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter shrink-0 animate-pulse">Live Ranking</span>
                                <div className="flex gap-6 overflow-x-auto no-scrollbar py-1">
                                    {rankings.map((r, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => navigate(`/stock/${r.stock_code}`)} 
                                            className="flex items-center gap-1.5 whitespace-nowrap group hover:bg-[var(--theme-bg)]/50 px-2 py-0.5 rounded-md transition-all"
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

                    {/* [v52.5] 네이버 스타일 테마 스위처 (Floating) */}
                    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3">
                        {logic.isThemeOpen && (
                            <div className="bg-[var(--theme-header)]/95 backdrop-blur-md border border-[var(--theme-border)]/50 p-4 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ring-1 ring-white/10 flex flex-col gap-4">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Style Theme</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'midnight', color: 'bg-[#020617]', name: 'Midnight' },
                                        { id: 'pure-white', color: 'bg-[#ffffff]', name: 'White' },
                                        { id: 'pitch-black', color: 'bg-[#000000]', name: 'Black' }
                                    ].map(t => (
                                        <button 
                                            key={t.id} 
                                            onClick={() => logic.setTheme(t.id)}
                                            className={classNames(
                                                "group flex flex-col items-center gap-1.5 transition-all hover:scale-110",
                                                logic.theme === t.id ? "opacity-100" : "opacity-60 hover:opacity-100"
                                            )}
                                        >
                                            <div className={classNames(
                                                "w-10 h-10 rounded-full border-2 transition-all shadow-lg",
                                                t.color,
                                                logic.theme === t.id ? "border-indigo-400 scale-110 ring-4 ring-indigo-400/20" : "border-[var(--theme-border)] hover:border-slate-500"
                                            )}></div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase">{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button 
                            onClick={() => logic.setIsThemeOpen(!logic.isThemeOpen)}
                            className={classNames(
                                "w-12 h-12 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 group relative overflow-hidden border border-white/10",
                                logic.isThemeOpen ? "bg-indigo-600 rotate-90" : "bg-[var(--theme-bg)] hover:bg-slate-700"
                            )}
                        >
                            <Palette size={20} className={classNames("transition-colors", logic.isThemeOpen ? "text-white" : "text-indigo-400 group-hover:text-white")} />
                            {!logic.isThemeOpen && <span className="absolute top-2.5 right-2.5 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-slate-900 text-[7px] font-black flex items-center justify-center text-white animate-bounce">3</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LayoutDesktop;
