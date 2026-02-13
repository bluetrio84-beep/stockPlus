import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import '../index.css';

const DailyPriceTable = ({ prices }) => {
  if (!prices || prices.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-xs h-full bg-slate-900/20">
        시세 데이터가 없습니다.
      </div>
    );
  }

  const colDefs = useMemo(() => [
    { 
      field: 'date', 
      headerName: '일자', 
      flex: 0.8, // 너비 비율 축소
      minWidth: 60, // 최소 너비 축소 (4자리 MM.DD 충분)
      cellClass: 'text-left font-medium text-white text-[11px] md:text-xs flex items-center', 
      valueFormatter: (params) => {
        if (!params.value) return '-';
        const date = new Date(params.value * 1000); 
        // MM.DD 형식으로 직접 변환 (공백 제거)
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
        return `font-bold text-[11px] md:text-xs flex items-center justify-end ${change > 0 ? 'text-trade-up' : change < 0 ? 'text-trade-down' : 'text-white'}`;
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
        const color = val > 0 ? 'text-trade-up' : val < 0 ? 'text-trade-down' : 'text-white';
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
        const color = val > 0 ? 'text-trade-up' : val < 0 ? 'text-trade-down' : 'text-white';
        const sign = val > 0 ? '+' : '';
        return <span className={color}>{sign}{Number(val).toFixed(2)}%</span>;
      }
    },
    { 
      field: 'volume', 
      headerName: '거래량', 
      flex: 1.3, 
      minWidth: 100, 
      cellClass: 'text-white text-[11px] md:text-xs flex items-center justify-end',
      valueFormatter: (params) => Number(params.value).toLocaleString()
    }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    suppressMenu: true,
    headerClass: 'bg-slate-900/50 text-white font-bold border-b border-slate-800 text-[11px] md:text-xs'
  }), []);

  const getRowClass = (params) => {
    return params.node.rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20';
  };

  return (
    <div className="absolute inset-0 w-full flex flex-col bg-slate-900/20 ag-theme-quartz-dark">
      <style>{`
        .ag-theme-quartz-dark {
          --ag-background-color: transparent;
          --ag-header-background-color: #0f172a;
          --ag-row-hover-color: rgba(30, 41, 59, 0.5);
          --ag-border-color: #1e293b;
          --ag-header-foreground-color: white; /* 헤더 텍스트 흰색 */
          --ag-font-family: 'Pretendard', sans-serif;
          --ag-font-size: 12px;
          --ag-header-cell-hover-background-color: #1e293b;
          --ag-data-color: white; /* 기본 데이터 텍스트 흰색 */
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
