import { useState, useRef } from 'react';
import { searchStocks, addToWatchlist } from '../api/stockApi';

/**
 * StockList의 검색 및 관리 로직을 담당하는 커스텀 훅
 */
export const useStockList = (globalMarketMode, activeWatchlistTab, loadWatchlist) => {
    const [localSearchKeyword, setLocalSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchTimeoutRef = useRef(null);

    // 검색 핸들러 (기존 로직 그대로)
    const handleSearch = (keyword) => {
        setLocalSearchKeyword(keyword);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!keyword.trim()) { setSearchResults([]); return; }
        
        searchTimeoutRef.current = setTimeout(async () => {
            const results = await searchStocks(keyword);
            setSearchResults(results);
        }, 300);
    };

    // 검색 결과 클릭 시 종목 추가 (기존 로직 그대로)
    const handleSearchResultClick = async (stock) => {
        await addToWatchlist({ ...stock, exchangeCode: globalMarketMode, groupId: activeWatchlistTab, isFavorite: false });
        if (loadWatchlist) await loadWatchlist(globalMarketMode, activeWatchlistTab);
        setLocalSearchKeyword(''); setSearchResults([]);
    };

    return {
        localSearchKeyword, setLocalSearchKeyword,
        searchResults,
        handleSearch,
        handleSearchResultClick
    };
};
