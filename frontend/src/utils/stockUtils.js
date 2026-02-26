/**
 * 주식 데이터의 시각적 표현을 돕는 유틸리티 함수 모음입니다.
 */

// 등락 기호(부호)를 반환합니다.
export const getSignSymbol = (sign, change) => {
    const changeVal = parseFloat(String(change || '0').replace(/,/g, ''));
    
    // 1. 상한가/하한가 코드 우선
    if (sign === '1') return '⬆';
    if (sign === '4') return '⬇';
    
    // 2. 코드 기반 또는 수치 기반 판단
    if (sign === '2' || changeVal > 0) return '▲';
    if (sign === '5' || changeVal < 0) return '▼';
    
    return ''; // 보합
};

// 등락에 따른 텍스트 색상 클래스를 반환합니다.
export const getColorClass = (sign, change) => {
    const changeVal = parseFloat(String(change || '0').replace(/,/g, ''));
    
    if (sign === '1' || sign === '2' || changeVal > 0) return 'text-trade-up';
    if (sign === '4' || sign === '5' || changeVal < 0) return 'text-trade-down';
    
    return 'text-slate-400'; // 보합
};

export const getMarketDisplay = (marketMode) => {
    if (marketMode === 'NX') {
        return { name: 'NXT', colorClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
    } else if (marketMode === 'UN') {
        return { name: 'UN', colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    } else {
        return { name: 'KRX', colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    }
};

export const getPriceBgClass = (sign) => '';

// 종목 상태 배지 정보를 반환합니다.
export const getStockStatusBadge = (input) => {
    if (!input) return null;
    let statusCode = '';
    let warnCode = '';
    if (typeof input === 'object') {
        statusCode = input.stockStatus;
        warnCode = input.marketWarning;
    } else {
        statusCode = input;
    }
    if (warnCode === '01') return { label: '주', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
    if (warnCode === '02') return { label: '경', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (warnCode === '03') return { label: '위', color: 'bg-red-500/20 text-red-500 border-red-500/30' };
    if (!statusCode || statusCode === '00' || statusCode === ' ') return null;
    const statusMap = {
        '51': { label: '관', color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
        '52': { label: '주', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
        '53': { label: '경', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
        '54': { label: '주', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
        '58': { label: '정', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    };
    return statusMap[statusCode] || null;
};

export const isKosdaq = (stock) => {
    if (!stock) return false;
    const market = (stock.marketType || stock.market_type)?.toUpperCase();
    return market === 'KOSDAQ';
};
