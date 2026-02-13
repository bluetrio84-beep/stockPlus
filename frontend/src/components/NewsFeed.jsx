import React from 'react';
import { Newspaper, ExternalLink, Sparkles } from 'lucide-react';

/**
 * 실시간 주요 뉴스를 목록 형태로 보여주는 컴포넌트입니다.
 * AI 요약(AI Summary)이 있는 경우 이를 우선적으로 표시하고, 없으면 일반 요약문을 보여줍니다.
 */
const NewsFeed = ({ news }) => {
    // 데이터 안전성 확보 (배열이 아닐 경우 빈 배열 처리)
    const safeNews = Array.isArray(news) ? news : [];

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* 헤더 섹션 */}
            <div className="p-4 border-b border-slate-800 bg-slate-850 flex items-center gap-2 shrink-0">
                <Newspaper className="text-indigo-400" size={18} />
                <h3 className="font-bold text-slate-200 text-sm">실시간 주요 뉴스</h3>
            </div>
            
            {/* 뉴스 리스트 영역 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {safeNews.length > 0 ? (
                    safeNews.map((item) => (
                        <div key={item.id || item.link} className="p-4 border-b border-slate-800 hover:bg-slate-800/50 transition-colors group">
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                                {/* 뉴스 제목 및 외부 링크 아이콘 */}
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="text-sm font-bold text-slate-200 leading-snug group-hover:text-indigo-400 transition-colors line-clamp-2">
                                        {item.title}
                                    </h4>
                                    <ExternalLink size={12} className="text-slate-600 shrink-0 mt-1" />
                                </div>
                                
                                {/* AI 요약이 있으면 강조하여 표시, 없으면 일반 본문 표시 */}
                                {item.aiSummary ? (
                                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5 mb-2">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Sparkles size={10} className="text-indigo-400" />
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">AI Summary</span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                            {item.aiSummary}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-2">
                                        {item.description}
                                    </p>
                                )}
                                
                                {/* 날짜/시간 정보 */}
                                <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                                    <span>{item.pubDate ? new Date(item.pubDate).toLocaleString('ko-KR', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                                </div>
                            </a>
                        </div>
                    ))
                ) : (
                    // 데이터가 없을 때 표시
                    <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                        <p className="text-xs">최신 뉴스가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsFeed;