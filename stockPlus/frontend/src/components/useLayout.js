import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchStockPrice, getAuthHeader, fetchTopRankings } from '../api/stockApi';

/**
 * Layout의 비즈니스 로직(지수 로드, 알림, 메뉴 관리)을 담당하는 훅
 */
export const useLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [marketIndices, setMarketIndices] = useState([]);
    const [rankings, setRankings] = useState([]); // [v13.5] 실시간 랭킹 추가
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    // [v52.5] 테마 관리 상태 추가
    const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'midnight');
    const [isThemeOpen, setIsThemeOpen] = useState(false);

    useEffect(() => {
        // [v52.5] 테마 변경 시 HTML 속성에 반영 및 저장
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);
    }, [theme]);
    
    const usrName = localStorage.getItem('usrName') || '사용자';

    const loadMarketIndices = useCallback(async () => {
        try {
            const [kospi, kosdaq, usdkrw, jpykrw, gold] = await Promise.all([
                fetchStockPrice('0001', 'IDX'),
                fetchStockPrice('1001', 'IDX'),
                fetchStockPrice('FX_USDKRW', 'FX'),
                fetchStockPrice('FX_JPYKRW', 'FX'),
                fetchStockPrice('CM_GOLD', 'CM')
            ]);
            setMarketIndices([
                { name: 'KOSPI', code: '0001', fullName: '코스피', price: kospi?.currentPrice || '0', change: kospi?.change || '0', rate: kospi?.changeRate || '0' },
                { name: 'KOSDAQ', code: '1001', fullName: '코스닥', price: kosdaq?.currentPrice || '0', change: kosdaq?.change || '0', rate: kosdaq?.changeRate || '0' },
                { name: 'USD/KRW', code: 'FX_USDKRW', fullName: '원/달러 환율 (달러)', isMacro: true, price: usdkrw?.currentPrice || '0', change: usdkrw?.change || '0', rate: usdkrw?.changeRate || '0' },
                { name: '100엔', code: 'FX_JPYKRW', fullName: '원/엔 환율 (엔화)', isMacro: true, price: jpykrw?.currentPrice || '0', change: jpykrw?.change || '0', rate: jpykrw?.changeRate || '0' },
                { name: '국제금', code: 'CM_GOLD', fullName: '국제금 시세 (금시세)', isMacro: true, prefix: '$', price: gold?.currentPrice || '0', change: gold?.change || '0', rate: gold?.changeRate || '0' }
            ]);
        } catch (error) {}
    }, []);

    const loadRankings = useCallback(async () => {
        try {
            const data = await fetchTopRankings();
            setRankings(data);
        } catch (e) {}
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/dashboard/notifications', { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
            const countRes = await fetch('/api/dashboard/notifications/unread-count', { headers: getAuthHeader() });
            if (countRes.ok) {
                const count = await countRes.json();
                setUnreadCount(count);
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        loadMarketIndices();
        loadRankings();
        fetchNotifications();
        const interval = setInterval(() => {
            loadMarketIndices();
            loadRankings();
            fetchNotifications();
        }, 30000); 
        return () => clearInterval(interval);
    }, [loadMarketIndices, loadRankings, fetchNotifications]);

    // [복구] 누락된 핸들러 함수들
    const handleNotificationToggle = async () => {
        setIsNotificationOpen(!isNotificationOpen);
        setIsUserMenuOpen(false);
        if (!isNotificationOpen && unreadCount > 0) {
            setUnreadCount(0);
            await fetch('/api/dashboard/notifications/read', { method: 'POST', headers: getAuthHeader() });
        }
    };

    const handleUserMenuToggle = () => {
        setIsUserMenuOpen(!isUserMenuOpen);
        setIsNotificationOpen(false);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return {
        navigate, location,
        isMenuOpen, setIsMenuOpen,
        marketIndices, rankings,
        notifications, unreadCount,
        isNotificationOpen, setIsNotificationOpen,
        isUserMenuOpen, setIsUserMenuOpen,
        usrName,
        handleNotificationToggle,
        handleUserMenuToggle,
        handleLogout,
        theme, setTheme, isThemeOpen, setIsThemeOpen
    };
};
