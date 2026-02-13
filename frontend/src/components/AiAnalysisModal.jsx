import React from 'react';
import { Sparkles, X } from 'lucide-react';

const AiAnalysisModal = ({ isOpen, onClose, stockName, content, isAnalysing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-850">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-base">
            <Sparkles size={18} className="shrink-0" /> <span>{stockName} AI 분석</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-950/30">
          <div className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap text-slate-100 font-sans break-keep [word-break:keep-all] [overflow-wrap:anywhere]">
            {(content || "").split('\n').map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={i} className="h-3" />;
              
              // 강조 구문(**)이나 리스트(*) 처리 보강
              const formattedLine = trimmed
                .replace(/\*\*(.*?)\*\*/g, (match, p1) => `<strong>${p1}</strong>`)
                .replace(/^\*\s/, '• ');

              return (
                <p 
                  key={i} 
                  className="mb-1.5 last:mb-0"
                  dangerouslySetInnerHTML={{ __html: formattedLine }} 
                />
              );
            }) || (isAnalysing && <div className="text-slate-400 italic">데이터 수집 및 분석 중...</div>)}
            {isAnalysing && <span className="inline-block w-1.5 h-4 ml-1 bg-yellow-400 animate-pulse"></span>}
          </div>
        </div>
        <div className="p-4 border-t border-slate-800 text-right bg-slate-900">
          <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors">
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiAnalysisModal;
