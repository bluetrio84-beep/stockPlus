import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import '../index.css';

const InvestorTable = ({ data, isDataLoaded }) => {
  // 로딩 중 표시
  if (!isDataLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-slate-900/20">
        <div className="animate-spin text-indigo-500 border-4 border-t-transparent border-indigo-500 rounded-full w-8 h-8"></div>
      </div>
    );
  }

  // 데이터 없음 표시
  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-xs h-full bg-slate-900/20">
        투자자 데이터가 없습니다.
      </div>
    );
  }

  // 컬럼 정의
  const colDefs = useMemo(() => [
    { 
      field: 'date', 
      headerName: '일자', 
      flex: 0.8, // 축소
      minWidth: 60, // 축소
      cellClass: 'text-left font-medium text-white text-[11px] md:text-xs flex items-center', 
      // MM.DD 포맷인지 확인 (이미 백엔드에서 MM.DD로 오지만 확실하게)
      valueFormatter: (params) => params.value
    },
    { 
      field: 'price', 
      headerName: '종가', 
      flex: 1.1, // 0.9 -> 1.1 (확대)
      minWidth: 80, // 70 -> 80 (확대)
      cellClass: (params) => {
        const change = parseInt(params.data.change || 0);
        return `font-bold text-[11px] md:text-xs flex items-center justify-end ${change > 0 ? 'text-trade-up' : change < 0 ? 'text-trade-down' : 'text-white'}`;
      },
      valueFormatter: (params) => Number(params.value).toLocaleString()
    },
    { 
      field: 'retailNet', 
      headerName: '개인', 
      flex: 1.3, // 1.2 -> 1.3 (확대)
      minWidth: 80,
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end',
      cellRenderer: (params) => {
        const val = parseInt(params.value || 0);
        const color = val > 0 ? 'text-trade-up' : val < 0 ? 'text-trade-down' : 'text-slate-500'; 
        return <span className={val === 0 ? 'text-slate-600' : color}>{Math.round(val).toLocaleString()}</span>;
      }
    },
    { 
      field: 'foreignNet', 
      headerName: '외인', 
      flex: 1.3, // 1.2 -> 1.3 (확대)
      minWidth: 80, 
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end',
      cellRenderer: (params) => {
        const val = parseInt(params.value || 0);
        const color = val > 0 ? 'text-trade-up' : val < 0 ? 'text-trade-down' : 'text-slate-500';
        return <span className={val === 0 ? 'text-slate-600' : color}>{Math.round(val).toLocaleString()}</span>;
      }
    },
    { 
      field: 'institutionNet', 
      headerName: '기관', 
      flex: 1.3, // 1.2 -> 1.3 (확대)
      minWidth: 80, 
      cellClass: 'font-bold text-[11px] md:text-xs flex items-center justify-end',
      cellRenderer: (params) => {
        const val = parseInt(params.value || 0);
        const color = val > 0 ? 'text-trade-up' : val < 0 ? 'text-trade-down' : 'text-slate-500';
        return <span className={val === 0 ? 'text-slate-600' : color}>{Math.round(val).toLocaleString()}</span>;
      }
    }
  ], []);

  // 기본 컬럼 설정
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
          --ag-header-foreground-color: white;
          --ag-font-family: 'Pretendard', sans-serif;
          --ag-font-size: 12px;
          --ag-header-cell-hover-background-color: #1e293b;
          --ag-data-color: white;
        }
        .ag-root-wrapper { border: none !important; }
        .ag-header-cell-label { justify-content: flex-start !important; } /* 헤더 좌측 정렬 */
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
