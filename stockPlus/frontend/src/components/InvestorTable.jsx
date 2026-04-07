import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import '../index.css';

const InvestorTable = ({ data, isDataLoaded }) => {
  if (!isDataLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-[var(--theme-bg)] transition-colors duration-500">
        <div className="animate-spin text-[var(--theme-point)] border-4 border-t-transparent border-[var(--theme-point)] rounded-full w-8 h-8"></div>
      </div>
    );
  }

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-xs h-full bg-[var(--theme-bg)] transition-colors duration-500">
        투자자 데이터가 없습니다.
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
      valueFormatter: (params) => params.value
    },
    { 
      field: 'price', 
      headerName: '종가', 
      flex: 1.1, 
      minWidth: 80, 
      cellClass: (params) => {
        const change = parseFloat(params.data.change || 0);
        const color = change > 0 ? 'text-rose-500' : change < 0 ? 'text-blue-500' : 'text-[var(--theme-text)]';
        return `font-bold text-[11px] md:text-xs flex items-center justify-end ${color} transition-colors`;
      },
      valueFormatter: (params) => Number(params.value).toLocaleString()
    },
    { 
      field: 'retailNet', 
      headerName: '개인', 
      flex: 1.3, 
      minWidth: 80,
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end transition-colors',
      cellRenderer: (params) => {
        const val = parseInt(params.value || 0);
        const color = val > 0 ? 'text-rose-500' : val < 0 ? 'text-blue-500' : 'text-[var(--theme-text)]'; 
        return <span className={color}>{Math.round(val).toLocaleString()}</span>;
      }
    },
    { 
      field: 'foreignNet', 
      headerName: '외인', 
      flex: 1.3, 
      minWidth: 80, 
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end transition-colors',
      cellRenderer: (params) => {
        const val = parseInt(params.value || 0);
        const color = val > 0 ? 'text-rose-500' : val < 0 ? 'text-blue-500' : 'text-[var(--theme-text)]';
        return <span className={color}>{Math.round(val).toLocaleString()}</span>;
      }
    },
    { 
      field: 'institutionNet', 
      headerName: '기관', 
      flex: 1.3, 
      minWidth: 80, 
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end transition-colors',
      cellRenderer: (params) => {
        const val = parseInt(params.value || 0);
        const color = val > 0 ? 'text-rose-500' : val < 0 ? 'text-blue-500' : 'text-[var(--theme-text)]';
        return <span className={color}>{Math.round(val).toLocaleString()}</span>;
      }
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
          rowData={data.items}
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

export default InvestorTable;
