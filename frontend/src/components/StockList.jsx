import React, { useState, useEffect } from 'react';
import { useStockList } from './useStockList';
import StockListMobile from './StockList_Mobile';
import StockListDesktop from './StockList_Desktop';

/**
 * 관심 종목 목록 컨테이너
 * 화면 크기에 따라 Mobile/Desktop 뷰를 동적으로 전환합니다.
 * 기존 디자인과 로직은 100% 보존되었습니다.
 */
const StockList = (props) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    
    // 리스트 관리 로직 분리 (커스텀 훅)
    const logic = useStockList(props.globalMarketMode, props.activeWatchlistTab, props.loadWatchlist);

    // 화면 리사이즈 감지
    useEffect(() => {
        let timeoutId = null;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setIsMobile(window.innerWidth < 1024);
            }, 150);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // 분기 렌더링
    if (isMobile) {
        return <StockListMobile {...props} logic={logic} />;
    }

    return <StockListDesktop {...props} logic={logic} />;
};

export default StockList;
