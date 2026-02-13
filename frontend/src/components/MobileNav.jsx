import React from 'react';
import { Home, Search, Newspaper } from 'lucide-react';
import classNames from 'classnames';

/**
 * 모바일 화면 하단에 고정되는 네비게이션 바 컴포넌트입니다.
 * 대시보드(Home), 검색(Search), 뉴스(News) 탭 간의 전환을 담당합니다.
 */
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
            {/* 아이콘: 활성화 상태에 따라 색상 변경 */}
            <Icon 
                size={24} 
                className={classNames("transition-colors", {
                    "text-slate-200": isActive,
                    "text-slate-600": !isActive
                })}
            />
            {/* 라벨 텍스트 */}
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
