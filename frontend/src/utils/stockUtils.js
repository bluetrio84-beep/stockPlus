/**
 * 주식 데이터의 시각적 표현을 돕는 유틸리티 함수 모음입니다.
 */

// 등락 기호(부호)를 반환합니다.
export const getSignSymbol = (sign) => {
    if (sign === '1') return '⬆'; // 상한가
    if (sign === '2') return '▲';
    if (sign === '4') return '⬇'; // 하한가
    if (sign === '5') return '▼';
    return '';
};

// 등락에 따른 텍스트 색상 클래스를 반환합니다.
export const getColorClass = (sign) => {
    if (sign === '1' || sign === '2') return 'text-trade-up';
    if (sign === '4' || sign === '5') return 'text-trade-down';
    return 'text-slate-400';
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

    // 입력값이 객체인 경우와 문자열(코드)인 경우를 모두 대응
    if (typeof input === 'object') {
        statusCode = input.stockStatus;
        warnCode = input.marketWarning;
    } else {
        statusCode = input;
    }
    
    // 1. 시장경고 코드 (mrkt_warn_cls_code) 우선 순위 (01:주의, 02:경고, 03:위험)
    if (warnCode === '01') return { label: '주', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' };
    if (warnCode === '02') return { label: '경', color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' };
    if (warnCode === '03') return { label: '위', color: 'bg-red-500/20 text-red-500 border-red-500/30' };

    // 2. 종목상태 코드 (iscd_stat_cls_code)
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

/**
 * 코스닥 종목인지 판별합니다.
 */
export const isKosdaq = (stock) => {
    if (!stock) return false;
    // 오직 DB에서 내려준 정보로만 판별
    const market = (stock.marketType || stock.market_type)?.toUpperCase();
    return market === 'KOSDAQ';
};
