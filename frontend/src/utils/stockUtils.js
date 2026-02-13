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
