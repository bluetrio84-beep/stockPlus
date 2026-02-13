import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, BarChart2, Home, Sparkles, Tag, LogOut, Menu, X } from 'lucide-react';
import classNames from 'classnames';

const LayoutDesktop = ({ logic }) => {
    const { 
        navigate, location, isMenuOpen, setIsMenuOpen, marketIndices, 
        unreadCount, isUserMenuOpen, setIsUserMenuOpen, usrName, 
        handleNotificationToggle, handleUserMenuToggle, handleLogout 
    } = logic;

    const navItems = [
        { name: '대시보드', path: '/', icon: Home },
        { name: '관심종목 요약', path: '/summary', icon: Sparkles },
        { name: 'AI 키워드 관리', path: '/keywords', icon: Tag },
    ];

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
            {/* 1. 상단 헤더 */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-40 shadow-md">
                <div className="flex items-center gap-4">
                    {/* [부활] 햄버거 버튼 */}
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    
                    {/* 로고 (Pro 제거) */}
                    <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/30">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">StockPlus</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 relative">
                    <button onClick={handleUserMenuToggle} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all shadow-sm">
                        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-xs font-black text-white">{usrName.charAt(0).toUpperCase()}</div>
                        <span className="text-xs font-bold text-slate-300">{usrName}님</span>
                    </button>
                    <button onClick={handleNotificationToggle} className="p-2 text-slate-400 hover:text-white relative group">
                        <Bell size={22} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
                    </button>

                    {/* 알림 팝업 */}
                    {logic.isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => logic.setIsNotificationOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-white">최신 알림</h3>
                                    {unreadCount > 0 && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">New {unreadCount}</span>}
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {logic.notifications.length > 0 ? (
                                        logic.notifications.map((notif, idx) => {
                                            const date = notif.createdAt ? new Date(notif.createdAt) : null;
                                            const timeStr = date && !isNaN(date) 
                                                ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                                                : '';
                                            return (
                                                <div key={idx} className="py-2.5 px-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors cursor-pointer">
                                                    <div className="flex gap-3 items-start">
                                                        <div className={classNames("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", notif.is_read === 0 ? "bg-indigo-500" : "bg-slate-700")}></div>
                                                        <div className="flex-1">
                                                            <p className="text-[11px] text-slate-200 leading-normal">{notif.message}</p>
                                                            <span className="text-[11px] text-slate-200 font-mono">{timeStr}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-10 text-center text-slate-500 text-xs">새로운 알림이 없습니다.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* 사용자 팝업 */}
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
                {/* 2. 좌측 사이드바 (토글 방식) */}
                <aside 
                    className={classNames(
                        "bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30",
                        isMenuOpen ? "w-64 opacity-100 p-4" : "w-0 opacity-0 p-0 border-none"
                    )}
                >
                    <div className="px-2 py-3 mb-4 whitespace-nowrap">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation</span>
                    </div>
                    <nav className="space-y-1.5 min-w-[224px]">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        // PC에서는 페이지 이동 시 자동으로 닫지 않거나, 
                                        // 기호에 따라 setIsMenuOpen(false)를 추가할 수 있습니다.
                                    }}
                                    className={classNames(
                                        "w-full text-left px-4 py-3.5 text-sm flex items-center gap-4 font-bold rounded-xl transition-all duration-200",
                                        isActive 
                                            ? "text-white bg-indigo-600 shadow-lg shadow-indigo-600/20" 
                                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    )}
                                >
                                    <item.icon size={18} className={classNames(isActive ? "text-white" : "text-slate-500")} />
                                    {item.name}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* 3. 우측 메인 영역 */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
                    {/* 시장 지수 바 */}
                    <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-2 flex gap-8 overflow-x-auto no-scrollbar shrink-0">
                        {marketIndices.map(index => (
                            <div key={index.name} className="flex items-center gap-2 whitespace-nowrap min-w-fit">
                                <span className="text-xs font-black text-slate-500">{index.name}</span>
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

                    {/* 실제 페이지 콘텐츠 */}
                    <main className="flex-1 overflow-hidden relative">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default LayoutDesktop;
