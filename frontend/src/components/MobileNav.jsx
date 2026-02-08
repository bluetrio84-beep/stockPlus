import React from 'react';
import { Home, Search, Newspaper } from 'lucide-react';
import classNames from 'classnames';

const MobileNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: Home, label: '대시보드' },
    { id: 'watchlist', icon: Search, label: '종목검색' },
    { id: 'news', icon: Newspaper, label: '뉴스' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex justify-around items-center z-50 md:hidden pb-safe">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1"
          >
            <Icon 
                size={24} 
                className={classNames("transition-colors", {
                    "text-slate-200": isActive,
                    "text-slate-600": !isActive
                })}
            />
            <span className={classNames("text-[10px] font-medium", {
                "text-slate-200": isActive,
                "text-slate-600": !isActive
            })}>
                {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default MobileNav;
