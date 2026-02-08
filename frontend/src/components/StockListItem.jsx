import React from 'react';
import classNames from 'classnames';
import { Star } from 'lucide-react';
import { getSignSymbol, getColorClass } from '../utils/stockUtils';

const StockListItem = ({ stock, isSelected, onStockClick, onToggleFavorite }) => {
    return (
        <div 
            onClick={() => onStockClick && onStockClick(stock)} 
            className={classNames("flex justify-between items-center p-3 cursor-pointer border-b border-slate-800 transition-colors relative group", {
                "bg-slate-800": isSelected,
                "hover:bg-slate-800/50": !isSelected
            })}
        >
            <div className="flex items-center gap-2">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(stock.code, stock.exchangeCode, !stock.isFavorite);
                    }}
                    className="p-1 text-slate-600 hover:text-yellow-400 z-10"
                >
                    <Star size={16} className={classNames("transition-all", {
                        "fill-yellow-400 text-yellow-400": stock.isFavorite,
                        "group-hover:text-yellow-500": !stock.isFavorite
                    })} />
                </button>
                <div>
                    <div className="font-bold text-slate-200">{stock.name}</div>
                    <div className="text-xs text-slate-500">{stock.code}</div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
                <div className={classNames("text-xl font-bold tracking-tight", getColorClass(stock.priceSign))}>
                    {stock.isExpected ? '*' : ''}{stock.price ? stock.price.toLocaleString() : '-'}
                </div>
                <div className={classNames("text-xs font-medium tabular-nums flex items-center", getColorClass(stock.priceSign))}>
                     {getSignSymbol(stock.priceSign)} {Math.abs(stock.changeRate || 0).toFixed(2)}%
                </div>
            </div>
        </div>
    );
};

export default StockListItem;