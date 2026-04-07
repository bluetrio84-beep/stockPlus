import React, { useState, useEffect } from 'react';
import { useLayout } from './useLayout';
import LayoutMobile from './Layout_Mobile';
import LayoutDesktop from './Layout_Desktop';

/**
 * 레이아웃 메인 컨테이너
 * 화면 크기에 따라 Mobile/Desktop 레이아웃을 동적으로 전환합니다.
 */
const Layout = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const logic = useLayout();

    // 화면 리사이즈 감지 최적화
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

    if (isMobile) {
        return <LayoutMobile logic={logic} />;
    }

    return <LayoutDesktop logic={logic} />;
};

export default Layout;
