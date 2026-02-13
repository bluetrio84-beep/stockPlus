import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchStockPrice, getAuthHeader } from '../api/stockApi';

/**
 * Layout의 비즈니스 로직(지수 로드, 알림, 메뉴 관리)을 담당하는 훅
 */
export const useLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [marketIndices, setMarketIndices] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    
    const usrName = localStorage.getItem('usrName') || '사용자';

    const loadMarketIndices = useCallback(async () => {
        try {
            const [kospi, kosdaq] = await Promise.all([
                fetchStockPrice('0001', 'IDX'),
                fetchStockPrice('1001', 'IDX')
            ]);
            setMarketIndices([
                { name: 'KOSPI', price: kospi?.currentPrice || '0', change: kospi?.change || '0', rate: kospi?.changeRate || '0' },
                { name: 'KOSDAQ', price: kosdaq?.currentPrice || '0', change: kosdaq?.change || '0', rate: kosdaq?.changeRate || '0' }
            ]);
        } catch (error) {}
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/stockPlus/api/dashboard/notifications', { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
            const countRes = await fetch('/stockPlus/api/dashboard/notifications/unread-count', { headers: getAuthHeader() });
            if (countRes.ok) {
                const count = await countRes.json();
                setUnreadCount(count);
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        loadMarketIndices();
        fetchNotifications();
        const interval = setInterval(() => {
            loadMarketIndices();
            fetchNotifications();
        }, 30000); 
        return () => clearInterval(interval);
    }, [loadMarketIndices, fetchNotifications]);

    const handleNotificationToggle = async () => {
        setIsNotificationOpen(!isNotificationOpen);
        setIsUserMenuOpen(false);
        if (!isNotificationOpen && unreadCount > 0) {
            setUnreadCount(0);
            await fetch('/stockPlus/api/dashboard/notifications/read', { method: 'POST', headers: getAuthHeader() });
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
        marketIndices,
        notifications, unreadCount,
        isNotificationOpen, setIsNotificationOpen,
        isUserMenuOpen, setIsUserMenuOpen,
        usrName,
        handleNotificationToggle,
        handleUserMenuToggle,
        handleLogout
    };
};
