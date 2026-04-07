import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Trash2, Tag, Info, AlertCircle } from 'lucide-react';
import classNames from 'classnames';
import { getAuthHeader } from '../api/stockApi';

/**
 * 사용자의 AI 분석 및 뉴스 필터링 키워드를 관리하는 컴포넌트입니다.
 * 입력된 키워드는 AI Market Insight 생성과 실시간 주요 뉴스 필터링에 사용됩니다.
 */
const AiKeywordManager = () => {
    const [keywords, setKeywords] = useState([]);
    const [newKeyword, setNewKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const MAX_KEYWORDS = 10;

    // 키워드 목록 로드
    const fetchKeywords = async () => {
        try {
            const res = await fetch('/api/dashboard/keywords', { headers: getAuthHeader() });
            if (res.ok) {
                const data = await res.json();
                setKeywords(data);
            }
        } catch (e) {
            console.error("Failed to fetch keywords", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchKeywords();
    }, []);

    const isLimitReached = keywords.length >= MAX_KEYWORDS;

    // 키워드 추가
    const handleAddKeyword = async (e) => {
        e.preventDefault();
        if (!newKeyword.trim() || isLimitReached) return;

        try {
            const res = await fetch('/api/dashboard/keywords', {
                method: 'POST',
                headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword: newKeyword.trim() })
            });
            if (res.ok) {
                setNewKeyword('');
                fetchKeywords();
            }
        } catch (e) {
            console.error("Failed to add keyword", e);
        }
    };

    // 키워드 삭제
    const handleDeleteKeyword = async (keyword) => {
        try {
            const res = await fetch(`/api/dashboard/keywords?keyword=${encodeURIComponent(keyword)}`, {
                method: 'DELETE',
                headers: getAuthHeader()
            });
            if (res.ok) {
                fetchKeywords();
            }
        } catch (e) {
            console.error("Failed to delete keyword", e);
        }
    };

    return (
        <div className="h-full bg-[var(--theme-bg)] p-4 lg:p-8 flex flex-col items-center custom-scrollbar overflow-y-auto transition-colors duration-500">
            <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* 헤더 섹션 */}
                <div className="bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden transition-colors duration-500">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <Sparkles size={120} className="text-[var(--theme-point)]" />
                    </div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="bg-[var(--theme-point)]/10 p-4 rounded-2xl mb-4 transition-colors">
                            <Tag className="text-[var(--theme-point)]" size={32} />
                        </div>
                        <h1 className="text-2xl lg:text-3xl font-black text-[var(--theme-text)] mb-2 transition-colors">AI 키워드 관리</h1>
                        <p className="text-slate-500 text-sm max-w-md leading-relaxed transition-colors">
                            입력하신 키워드를 바탕으로 전담 AI 분석가가 시장을 모니터링하고 <br/>
                            나에게 꼭 필요한 뉴스만 골라 정리해 드립니다.
                        </p>
                    </div>
                </div>

                {/* 키워드 입력 폼 */}
                <form onSubmit={handleAddKeyword} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                                type="text" 
                                placeholder={isLimitReached ? "키워드는 최대 10개까지 가능합니다" : "새로운 분석 키워드 입력 (예: 반도체, 부동산정책...)"}
                                className={classNames("w-full bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] rounded-2xl py-4 pl-12 pr-4 text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-point)]/50 transition-all shadow-xl", {
                                    "opacity-50 cursor-not-allowed": isLimitReached
                                })}
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                disabled={isLimitReached}
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!newKeyword.trim() || isLimitReached}
                            className="bg-[var(--theme-point)] hover:bg-[var(--theme-point)]/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 rounded-2xl transition-all shadow-lg flex items-center gap-2 shrink-0"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">추가</span>
                        </button>
                    </div>
                    {isLimitReached && (
                        <p className="text-xs text-red-500 font-bold ml-4 flex items-center gap-1.5 animate-pulse">
                            <AlertCircle size={12} /> 키워드 등록 한도(10개)에 도달했습니다. 기존 키워드를 삭제 후 추가해 주세요.
                        </p>
                    )}
                </form>

                {/* 안내 메시지 */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start transition-colors">
                    <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-xs text-amber-800/80 leading-relaxed transition-colors">
                        <p className="font-bold text-amber-700 mb-1">💡 분석 가이드</p>
                        키워드를 구체적으로 입력할수록 AI 분석의 정확도가 높아집니다. <br/>
                        (예: '삼성전자' 보다는 '삼성전자 반도체 전망')
                    </div>
                </div>

                {/* 키워드 목록 */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2 mb-4 transition-colors">현재 관리 중인 키워드 ({keywords.length})</h3>
                    {isLoading ? (
                        <div className="flex justify-center py-12 text-slate-600"><div className="w-6 h-6 border-2 border-[var(--theme-point)] border-t-transparent rounded-full animate-spin"></div></div>
                    ) : keywords.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {keywords.map((keyword, idx) => (
                                <div 
                                    key={idx} 
                                    className="group bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-2xl p-4 flex justify-between items-center hover:border-[var(--theme-point)]/50 transition-all shadow-md transition-colors duration-500"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-[var(--theme-point)] rounded-full transition-colors"></div>
                                        <span className="text-[var(--theme-text)] font-bold transition-colors">{keyword}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteKeyword(keyword)}
                                        className="text-slate-500 hover:text-red-500 p-2 rounded-xl hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-[var(--theme-header)] border border-dashed border-[var(--theme-border)] rounded-3xl text-slate-500 transition-colors duration-500">
                            <AlertCircle size={40} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">등록된 키워드가 없습니다.</p>
                            <p className="text-xs mt-1">위 검색창에서 첫 번째 키워드를 추가해 보세요!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiKeywordManager;
