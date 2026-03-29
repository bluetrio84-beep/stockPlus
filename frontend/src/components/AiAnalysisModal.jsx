import React from 'react';
import { Sparkles, X } from 'lucide-react';

const AiAnalysisModal = ({ isOpen, onClose, stockName, content, isAnalysing }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden transition-colors duration-500">
        <div className="p-4 border-b border-[var(--theme-border)] flex justify-between items-center bg-[var(--theme-header)] transition-colors">
          <div className="flex items-center gap-2 text-[var(--theme-point)] font-black text-base transition-colors">
            <Sparkles size={18} className="shrink-0" /> <span>{stockName} AI 분석</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[var(--theme-border)]/50 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-[var(--theme-header)]/30 transition-colors">
          <div className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap text-[var(--theme-text)] font-black font-sans break-keep [word-break:keep-all] [overflow-wrap:anywhere] transition-colors">
            {(content || "").split('\n').map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={i} className="h-3" />;
              
              const formattedLine = trimmed
                .replace(/\*\*(.*?)\*\*/g, (match, p1) => `<strong class="text-[var(--theme-point)]">${p1}</strong>`)
                .replace(/^\*\s/, '• ');

              return (
                <p 
                  key={i} 
                  className="mb-1.5 last:mb-0 transition-colors"
                  dangerouslySetInnerHTML={{ __html: formattedLine }} 
                />
              );
            }) || (isAnalysing && <div className="text-slate-400 italic font-medium">데이터 수집 및 분석 중...</div>)}
            {isAnalysing && <span className="inline-block w-1.5 h-4 ml-1 bg-[var(--theme-point)] animate-pulse"></span>}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--theme-border)] text-right bg-[var(--theme-bg)] transition-colors">
          <button onClick={onClose} className="px-8 py-2.5 bg-[var(--theme-point)] hover:opacity-90 text-white font-black rounded-xl transition-all active:scale-95 shadow-lg shadow-[var(--theme-point)]/20">
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiAnalysisModal;
