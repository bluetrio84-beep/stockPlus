import React from 'react';
import classNames from 'classnames';
import { Star } from 'lucide-react';
import { getSignSymbol, getColorClass, getStockStatusBadge, isKosdaq } from '../utils/stockUtils';

/**
 * 리스트에서 개별 주식 항목을 표시하는 UI 컴포넌트입니다.
 */
const StockListItem = ({ stock, isSelected, onStockClick, onToggleFavorite }) => {
    const sign = stock.priceSign;
    const badge = getStockStatusBadge(stock);

    const isMacro = stock.code && (stock.code.startsWith('FX_') || stock.code.startsWith('CM_') || stock.code.includes('USD') || stock.code.includes('JPY') || stock.code.includes('GOLD'));
    const formattedPrice = stock.price 
        ? (isMacro || stock.price % 1 !== 0 
            ? Number(stock.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : Number(stock.price).toLocaleString()) 
        : '-';
    const formattedChange = stock.change !== undefined && stock.change !== null
        ? (isMacro || stock.change % 1 !== 0
            ? Math.abs(stock.change).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : Math.abs(stock.change).toLocaleString())
        : '0';

    return (
        <div 
            onClick={() => onStockClick && onStockClick(stock)} 
            className={classNames("flex justify-between items-center p-3 cursor-pointer border-b border-[var(--theme-border)] transition-colors relative group gap-2", {
                "bg-[var(--theme-point)]/10": isSelected,
                "hover:bg-[var(--theme-bg)]/50": !isSelected
            })}
        >
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(stock.code, stock.exchangeCode, !stock.isFavorite);
                    }}
                    className="p-1 text-slate-500 hover:text-yellow-400 z-10 shrink-0"
                >
                    <Star size={16} className={classNames("transition-all", {
                        "fill-yellow-400 text-yellow-400": stock.isFavorite,
                        "group-hover:text-yellow-500": !stock.isFavorite
                    })} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="font-bold text-[var(--theme-text)] flex items-center gap-1.5 transition-colors min-w-0">
                        <span className="truncate" title={stock.name}>{stock.name}</span>
                        {isKosdaq(stock) && <span className="text-[var(--theme-point)] shrink-0">*</span>}
                        {badge && <span className={classNames("text-[10px] px-1 rounded border leading-tight shrink-0", badge.color)}>{badge.label}</span>}
                        {isMacro && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 shrink-0">
                                {stock.code.startsWith('CM_') ? '원자재' : '환율'}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 opacity-80">{stock.code}</div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0 text-right whitespace-nowrap min-w-[110px]">
                <div className={classNames("text-xl font-bold tabular-nums tracking-tight text-right whitespace-nowrap", getColorClass(sign, stock.change))}>
                    {stock.isExpected ? '*' : ''}{formattedPrice}
                </div>
                <div className={classNames("text-xs font-bold tabular-nums flex items-center gap-0.5 justify-end text-right whitespace-nowrap", getColorClass(sign, stock.change))}>
                     {getSignSymbol(sign, stock.change)} {formattedChange} ({Math.abs(stock.changeRate || 0).toFixed(2)}%)
                </div>
            </div>
        </div>
    );
};

export default StockListItem;
