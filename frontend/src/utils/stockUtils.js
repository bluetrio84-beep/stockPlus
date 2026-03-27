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
        return { name: 'NXT', colorClass: 'bg-purple-600/10 text-purple-600 border-purple-600/30' };
    } else if (marketMode === 'UN') {
        return { name: 'UN', colorClass: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/30' };
    } else {
        return { name: 'KRX', colorClass: 'bg-blue-600/10 text-blue-600 border-blue-600/30' };
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

// [추가] 테마별 차트 전용 색상 맵핑 (실시간 전환용)
export const getThemeColors = (theme) => {
    switch (theme) {
        case 'pure-white':
            return { bg: '#f8fafc', text: '#0f172a', border: '#e2e8f0' };
        case 'pitch-black':
            return { bg: '#0a0a0a', text: '#94a3b8', border: '#262626' };
        case 'forest-green':
            return { bg: '#065f46', text: '#ecfdf5', border: '#065f46' };
        case 'royal-wine':
            return { bg: '#7f1d1d', text: '#fff1f2', border: '#7f1d1d' };
        case 'deep-ocean':
            return { bg: '#075985', text: '#f0f9ff', border: '#075985' };
        default: // midnight (default)
            return { bg: '#0f172a', text: '#94a3b8', border: '#334155' };
    }
};
