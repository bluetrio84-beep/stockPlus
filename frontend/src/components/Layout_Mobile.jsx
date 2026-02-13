import React from 'react';
import { Outlet } from 'react-router-dom';
import { Bell, Menu, BarChart2, Home, X, Sparkles, Tag, LogOut } from 'lucide-react';
import classNames from 'classnames';

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
    ];

    return (
        <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-200 font-sans overflow-hidden select-none">
            {/* Header (모바일 상단 바) */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-40 relative shadow-lg">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-2 text-slate-400 active:bg-slate-800 rounded-full transition-colors">
                        <Menu size={24} />
                    </button>
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/20">
                            <BarChart2 size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">StockPlus</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 relative">
                    <button 
                        onClick={handleUserMenuToggle}
                        className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 mr-1 shadow-sm active:bg-slate-700"
                    >
                        <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-[11px] font-black text-white">
                            {usrName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-bold text-slate-300 max-w-[60px] truncate">{usrName}님</span>
                    </button>

                    <button onClick={handleNotificationToggle} className="p-2 text-slate-400 relative">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse"></span>}
                    </button>

                    {/* 알림 팝업 */}
                    {logic.isNotificationOpen && (
                        <>
                            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => logic.setIsNotificationOpen(false)}></div>
                            <div className="absolute top-12 right-0 z-50 w-[calc(100vw-32px)] max-w-[300px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-white">최신 알림</h3>
                                    <button onClick={() => logic.setIsNotificationOpen(false)}><X size={18} className="text-slate-500" /></button>
                                </div>
                                <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                                    {logic.notifications.length > 0 ? (
                                        logic.notifications.map((notif, idx) => {
                                            const date = notif.createdAt ? new Date(notif.createdAt) : null;
                                            const timeStr = date && !isNaN(date) 
                                                ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
                                                : '';
                                            return (
                                                <div key={idx} className="py-2 px-4 border-b border-slate-800/50 active:bg-slate-800 transition-colors">
                                                    <div className="flex gap-3 items-start">
                                                        <div className={classNames("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", notif.is_read === 0 ? "bg-indigo-500" : "bg-slate-700")}></div>
                                                        <div className="flex-1">
                                                            <p className="text-[10px] text-slate-200 leading-normal">{notif.message}</p>
                                                            <span className="text-[11px] text-slate-200 font-mono">{timeStr}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-10 text-center text-slate-500 text-xs font-bold">새로운 알림이 없습니다.</div>
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

            {/* 시장 지수 바 (초슬림 & 스크롤 제거) */}
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-1.5 shrink-0 overflow-hidden">
                <div className="flex items-center justify-start gap-5">
                    {marketIndices.map(index => (
                        <div key={index.name} className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500">{index.name}</span>
                            <span className="text-[11px] font-bold font-mono text-slate-200">{parseFloat(index.price || 0).toLocaleString()}</span>
                            <span className={classNames("text-[10px] font-bold font-mono flex items-center gap-0.5", { "text-trade-up": parseFloat(index.change) > 0, "text-trade-down": parseFloat(index.change) < 0, "text-slate-500": parseFloat(index.change) === 0 })}>
                                {parseFloat(index.change) > 0 ? '▲' : (parseFloat(index.change) < 0 ? '▼' : '')} 
                                {Math.abs(parseFloat(index.change || 0)).toFixed(2)}
                                <span className="ml-0.5 text-[9px] opacity-80">({index.rate}%)</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 메뉴 드로어 (PC와 디자인 동일하게 이식) */}
            {isMenuOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-slate-900 shadow-2xl py-4 animate-in slide-in-from-left duration-200 border-r border-slate-800">
                        {/* PC 스타일의 NAVIGATION 헤더 */}
                        <div className="px-6 py-6 flex justify-between items-center border-b border-slate-800 mb-4">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation</span>
                            <button onClick={() => setIsMenuOpen(false)}><X size={20} className="text-slate-500" /></button>
                        </div>
                        
                        <div className="space-y-1.5 px-3">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                                        className={classNames(
                                            "w-full text-left px-4 py-4 text-base flex items-center gap-4 font-bold rounded-xl transition-all",
                                            isActive 
                                                ? "text-white bg-indigo-600 shadow-lg shadow-indigo-600/20" 
                                                : "text-slate-400 active:bg-slate-800"
                                        )}
                                    >
                                        <item.icon size={20} className={isActive ? "text-white" : "text-slate-500"} />
                                        {item.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <main className="flex-1 overflow-hidden relative pb-4">
                <Outlet />
            </main>
        </div>
    );
};

export default LayoutMobile;
