export const getSignSymbol = (sign) => {
    if (sign === '1' || sign === '2') return '▲';
    if (sign === '4' || sign === '5') return '▼';
    return '';
};

export const getColorClass = (sign) => {
    if (sign === '1' || sign === '2') return 'text-trade-up';
    if (sign === '4' || sign === '5') return 'text-trade-down';
    return 'text-slate-400';
};

// 시장별 색상 및 이름 반환 유틸리티
export const getMarketDisplay = (marketMode) => {
    if (marketMode === 'NX') {
        return {
            name: 'NXT',
            colorClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        };
    } else if (marketMode === 'UN') {
        return {
            name: 'UN',
            colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        };
    } else {
        return {
            name: 'KRX',
            colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
    }
};