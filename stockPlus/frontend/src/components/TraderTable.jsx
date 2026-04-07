import React, { useMemo } from 'react';
import classNames from 'classnames';
import { Target, ArrowDownCircle, ArrowUpCircle, Info } from 'lucide-react';

const TraderTable = ({ traderData }) => {
    const parsedData = useMemo(() => {
        if (!traderData || !traderData.top_brokers) return null;
        try {
            const [sellPart, buyPart] = traderData.top_brokers.split(' / ');
            const sellBrokers = sellPart.replace('매도: ', '').split(',').map(s => s.trim());
            const buyBrokers = buyPart.replace('매수: ', '').split(',').map(s => s.trim());
            return { sellBrokers, buyBrokers };
        } catch (e) {
            console.error("Trader Parsing Error:", e);
            return null;
        }
    }, [traderData]);

    if (!parsedData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 bg-[var(--theme-bg)] transition-colors duration-500">
                <Info size={24} className="opacity-50" />
                <p className="text-xs font-bold">수집된 거래원 데이터가 없습니다.</p>
            </div>
        );
    }

    const renderBrokerRow = (broker, i, isBuy = false) => {
        const isTotal = i === 5;
        let name = "", val = "";
        if (isTotal) {
            name = "외국계 합";
            val = parseInt(broker.replace(/[^0-9-]/g, '') || 0).toLocaleString();
        } else {
            name = broker.split('(')[0];
            const rawVal = broker.includes('(') ? broker.split('(')[1].replace(/[^0-9]/g, '') : '0';
            val = parseInt(rawVal).toLocaleString();
        }

        const colorClass = isBuy ? "text-rose-500" : "text-blue-500";
        const bgColor = isBuy ? (isTotal ? "bg-rose-500/10" : "hover:bg-rose-500/5") : (isTotal ? "bg-blue-500/10" : "hover:bg-blue-500/5");
        const borderColor = isBuy ? "border-rose-500/20" : "border-blue-500/20";

        return (
            <div key={i} className={classNames(
                "px-2 py-2.5 flex justify-between items-center transition-colors group border-b border-[var(--theme-border)]/50",
                isTotal && `border-y ${borderColor}`,
                bgColor
            )}>
                <span className={classNames(
                    "transition-colors truncate mr-2",
                    isTotal ? "text-[var(--theme-text)] font-black text-[13px]" : "text-[var(--theme-text)] font-bold text-[12px]"
                )}>
                    {name}
                </span>
                <span className={classNames(
                    "font-mono whitespace-nowrap shrink-0",
                    isTotal ? `${colorClass} font-black text-[13px]` : `${colorClass} font-bold text-[12px]`
                )}>
                    {val}
                </span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] overflow-hidden transition-colors duration-500">
            <div className="px-4 py-2 bg-[var(--theme-header)] border-b border-[var(--theme-border)] flex items-center justify-between">
                <span className="text-[10px] font-black text-[var(--theme-point)] uppercase tracking-tighter flex items-center gap-1.5">
                    <Target size={12} /> UN(통합) 전용 실시간 거래원 추정
                </span>
                <span className="text-[9px] text-slate-500 font-mono transition-colors">
                    {traderData.captured_at ? new Date(traderData.captured_at).toLocaleTimeString() : ''}
                </span>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <div className="grid grid-cols-2 h-full content-start">
                    <div className="border-r border-[var(--theme-border)] flex flex-col">
                        <div className="px-3 py-2 bg-blue-500/5 flex items-center gap-1.5 border-b border-[var(--theme-border)]/50">
                            <ArrowDownCircle size={14} className="text-blue-500" />
                            <span className="text-[11px] font-black text-blue-500 uppercase">매도 상위</span>
                        </div>
                        <div className="flex-1">
                            {parsedData.sellBrokers.map((b, i) => renderBrokerRow(b, i, false))}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <div className="px-3 py-2 bg-rose-500/5 flex items-center gap-1.5 border-b border-[var(--theme-border)]/50">
                            <ArrowUpCircle size={14} className="text-rose-500" />
                            <span className="text-[11px] font-black text-rose-500 uppercase">매수 상위</span>
                        </div>
                        <div className="flex-1">
                            {parsedData.buyBrokers.map((b, i) => renderBrokerRow(b, i, true))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-2 border-t border-[var(--theme-border)] bg-[var(--theme-header)] transition-colors duration-500">
                <p className="text-[9px] text-slate-500 leading-tight text-center italic">
                    * 위 데이터는 주요 창구 거래량을 기반으로 한 실시간 추정치이며 실제와 다를 수 있습니다.
                </p>
            </div>
        </div>
    );
};

export default TraderTable;
