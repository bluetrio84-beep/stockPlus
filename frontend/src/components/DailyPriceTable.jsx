import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import '../index.css';

const DailyPriceTable = ({ prices }) => {
  if (!prices || prices.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-xs h-full bg-[var(--theme-bg)]">
        시세 데이터가 없습니다.
      </div>
    );
  }

  const colDefs = useMemo(() => [
    { 
      field: 'date', 
      headerName: '일자', 
      flex: 0.8, 
      minWidth: 60, 
      cellClass: 'text-left font-medium text-[var(--theme-text)] text-[11px] md:text-xs flex items-center transition-colors', 
      valueFormatter: (params) => {
        if (!params.value) return '-';
        const date = new Date(params.value * 1000); 
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}.${day}`;
      }
    },
    { 
      field: 'close', 
      headerName: '종가', 
      flex: 1.2, 
      minWidth: 90,
      cellClass: (params) => {
        const change = params.data.change || 0;
        return `font-bold text-[11px] md:text-xs flex items-center justify-end ${change > 0 ? 'text-trade-up' : change < 0 ? 'text-trade-down' : 'text-[var(--theme-text)]'}`;
      },
      valueFormatter: (params) => Number(params.value).toLocaleString()
    },
    { 
      field: 'change', 
      headerName: '전일비', 
      flex: 1,
      minWidth: 80,
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end',
      cellRenderer: (params) => {
        const val = params.value || 0;
        const color = val > 0 ? 'text-trade-up' : val < 0 ? 'text-trade-down' : 'text-[var(--theme-text)]';
        const sign = val > 0 ? '▲' : val < 0 ? '▼' : '';
        return <span className={color}>{sign} {Math.abs(val).toLocaleString()}</span>;
      }
    },
    { 
      field: 'changeRate', 
      headerName: '등락률', 
      flex: 1, 
      minWidth: 80, 
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end',
      cellRenderer: (params) => {
        const val = params.value || 0;
        const color = val > 0 ? 'text-trade-up' : val < 0 ? 'text-trade-down' : 'text-[var(--theme-text)]';
        const sign = val > 0 ? '+' : '';
        return <span className={color}>{sign}{Number(val).toFixed(2)}%</span>;
      }
    },
    { 
      field: 'volume', 
      headerName: '거래량', 
      flex: 1.3, 
      minWidth: 100, 
      cellClass: 'text-[var(--theme-text)] text-[11px] md:text-xs flex items-center justify-end transition-colors',
      valueFormatter: (params) => Number(params.value).toLocaleString()
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    suppressMenu: true,
    headerClass: 'bg-[var(--theme-header)] text-[var(--theme-text)] font-bold border-b border-[var(--theme-border)] text-[11px] md:text-xs transition-colors'
  }), []);

  const getRowClass = (params) => {
    return params.node.rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-[var(--theme-point)]/5';
  };

  return (
    <div className="absolute inset-0 w-full flex flex-col bg-[var(--theme-bg)] ag-theme-quartz transition-colors duration-500">
      <style>{`
        .ag-theme-quartz {
          --ag-background-color: transparent;
          --ag-header-background-color: var(--theme-header);
          --ag-row-hover-color: var(--theme-point-alpha, rgba(99, 102, 241, 0.1));
          --ag-border-color: var(--theme-border);
          --ag-header-foreground-color: var(--theme-text);
          --ag-font-family: 'Pretendard', sans-serif;
          --ag-font-size: 12px;
          --ag-header-cell-hover-background-color: var(--theme-border);
          --ag-data-color: var(--theme-text);
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { justify-content: flex-start !important; }
      `}</style>
      <div className="flex-1 w-full">
        <AgGridReact
          rowData={prices}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          getRowClass={getRowClass}
          headerHeight={36}
          rowHeight={36}
          animateRows={true}
          overlayNoRowsTemplate='<span class="text-slate-500 text-xs">데이터가 없습니다.</span>'
        />
      </div>
    </div>
  );
};

export default DailyPriceTable;
