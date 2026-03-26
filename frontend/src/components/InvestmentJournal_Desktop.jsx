import React from 'react';
import { 
    Book, Search, Plus, Save, Trash2, Star, ChevronLeft, ChevronRight,
    Calendar, Tag, Eye, Edit3, Clock, Layout as LayoutIcon, FileText,
    Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, 
    Palette, Minus, CheckCircle2, Image as ImageIcon, X, AlertTriangle, AlertCircle, Type, Eraser
} from 'lucide-react';
import classNames from 'classnames';

const InvestmentJournalDesktop = ({ 
    notes, categories, selectedNote, setSelectedNote, onFetchDetail,
    isEditing, setIsEditing, handleSaveNote, confirmDelete, 
    searchTerm, setSearchTerm, filterCategory, setCategory,
    currentPage, setCurrentPage, totalPages, paginatedNotes,
    createNewNote, handleEditStart, editorRef, fileInputRef, quillRef, execCommand, 
    notification, notifType,
    searchStocks, stockSearchResults, showStockSearch, setShowStockSearch, selectStock,
    isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteNote, handleImageUpload
    }) => {
    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] transition-colors duration-500 text-slate-200 overflow-hidden animate-in fade-in duration-500 font-sans relative">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            
            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-[32px] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2"><AlertTriangle size={32} /></div>
                            <h3 className="text-xl font-black text-white">정말 삭제하시겠습니까?</h3>
                            <p className="text-sm text-slate-500 font-bold leading-relaxed">삭제된 통찰은 복구할 수 없습니다.</p>
                            <div className="flex gap-3 w-full mt-6">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs transition-all">취소</button>
                                <button onClick={handleDeleteNote} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs shadow-lg shadow-rose-600/20 transition-all">삭제하기</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
                    <div className={classNames(
                        "px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-sm ring-4",
                        notifType === 'SUCCESS' ? "bg-emerald-500 text-white ring-emerald-500/20" : 
                        notifType === 'WARNING' ? "bg-amber-500 text-white ring-amber-500/20" : "bg-rose-500 text-white ring-rose-500/20"
                    )}>
                        {notifType === 'SUCCESS' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {notification}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="shrink-0 h-16 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500/50 backdrop-blur-xl flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-lg"><Book size={20} /></div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-widest text-white italic">Investment Journal</h1>
                        <p className="text-[10px] text-slate-500 font-bold tracking-tight uppercase tracking-[0.2em]">Premium Strategy Archive</p>
                    </div>
                </div>
                <button onClick={createNewNote} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg active:scale-95"><Plus size={14} /> 등록</button>
            </div>

            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-80 lg:w-96 border-r border-[var(--theme-border)] transition-colors duration-500 flex flex-col bg-[var(--theme-bg)] transition-colors duration-500 z-10 shadow-2xl">
                    <div className="p-4 space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input type="text" placeholder="데이터 수색..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold placeholder:text-slate-700 outline-none" />
                        </div>
                        <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => { setCategory(cat.id); setCurrentPage(1); }} className={classNames("px-3 py-1.5 rounded-lg text-[9px] font-black shrink-0 transition-all border whitespace-nowrap", filterCategory === cat.id ? `${cat.color} text-white border-transparent shadow-lg` : "bg-[var(--theme-header)] transition-colors duration-500 text-slate-500 border-[var(--theme-border)] transition-colors duration-500 hover:text-slate-300")}>{cat.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-2">
                        {paginatedNotes.map(note => (
                            <div key={note.id} onClick={() => onFetchDetail(note)} className={classNames(
                                "p-4 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden",
                                selectedNote?.id === note.id ? "bg-[var(--theme-header)] transition-colors duration-500 border-indigo-500/50 shadow-2xl ring-1 ring-indigo-500/20" : "hover:bg-white/5 border-slate-900"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={classNames("px-2 py-0.5 rounded text-[8px] font-black text-white shadow-sm", categories.find(c => c.id === note.category)?.color || 'bg-slate-500')}>{categories.find(c => c.id === note.category)?.label}</span>
                                    {note.isImportant && <Star size={12} className="fill-amber-400 text-amber-400" />}
                                </div>
                                <h3 className={classNames("text-xs font-black truncate mb-1", selectedNote?.id === note.id ? "text-white" : "text-slate-300 group-hover:text-white transition-colors")}>{note.title}</h3>
                                <div className="flex items-center gap-3 text-[9px] text-slate-600 font-bold mt-2">
                                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(note.createdAt).toLocaleDateString()}</span>
                                    {note.refCode && <span className="text-cyan-500 font-black uppercase tracking-tighter truncate max-w-[180px] bg-cyan-500/5 px-1.5 rounded"># {note.stockName || note.refCode}</span>}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); confirmDelete(note.id); }} className="absolute right-3 bottom-3 p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="p-4 border-t border-[var(--theme-border)] transition-colors duration-500 flex items-center justify-center gap-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 text-slate-500 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Page {currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 text-slate-500 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-[var(--theme-header)] transition-colors duration-500/20 relative overflow-hidden">
                    {selectedNote ? (
                        <>
                            <div className="h-14 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-bg)] transition-colors duration-500/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-20">
                                <div className="flex items-center gap-4 text-white">
                                    <button onClick={() => isEditing ? setIsEditing(false) : handleEditStart()} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 active:scale-95">
                                        {isEditing ? <><ChevronLeft size={14} /> 작성 취소</> : <><Edit3 size={14} /> 수정</>}
                                    </button>
                                    <div className="h-4 w-px bg-slate-800 mx-2" />
                                    <button onClick={() => setSelectedNote({...selectedNote, isImportant: !selectedNote.isImportant})} className={classNames("flex items-center gap-2 text-[10px] font-black transition-all uppercase tracking-widest", selectedNote.isImportant ? "text-amber-400" : "text-slate-600 hover:text-slate-400")}>
                                        <Star size={16} fill={selectedNote.isImportant ? "currentColor" : "none"} /> Priority
                                    </button>
                                </div>
                                {isEditing && (
                                    <button onClick={handleSaveNote} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg active:scale-95 animate-in zoom-in-95"><Save size={14} /> 저장</button>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12">
                                <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                    {isEditing ? (
                                        <div className="space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2 text-white">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 italic">Category</label>
                                                    <select value={selectedNote.category} onChange={(e) => setSelectedNote({...selectedNote, category: e.target.value})} className="w-full bg-[var(--theme-bg)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl px-4 py-3 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 outline-none font-bold shadow-inner cursor-pointer">
                                                        {categories.filter(c => c.id !== 'ALL').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1 italic">Reference Stock Search</label>
                                                    <div className="relative">
                                                        <Tag className={classNames("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", showStockSearch ? "text-indigo-400" : "text-slate-600")} size={14} />
                                                        <input type="text" placeholder="종목명 또는 코드 입력 (예: 삼성)" value={selectedNote.stockName ? `${selectedNote.stockName} (${selectedNote.refCode})` : selectedNote.refCode} onChange={(e) => { const v = e.target.value; setSelectedNote({...selectedNote, refCode: v, stockName: ''}); searchStocks(v); }} onFocus={() => setShowStockSearch(true)} className="w-full bg-[var(--theme-bg)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono font-black shadow-inner" />
                                                        
                                                        {showStockSearch && stockSearchResults.length > 0 && (
                                                            <>
                                                                <div className="fixed inset-0 z-[45]" onClick={() => setShowStockSearch(false)} />
                                                                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl shadow-2xl z-[50] overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                                                    {stockSearchResults.map(s => (
                                                                        <div key={s.stockCode} onClick={() => selectStock(s)} className="px-4 py-3 hover:bg-white/10 cursor-pointer flex justify-between items-center transition-colors border-b border-[var(--theme-border)] transition-colors duration-500 last:border-none">
                                                                            <span className="text-xs font-black text-white">{s.stockName}</span>
                                                                            <span className="text-[10px] font-mono text-slate-500 bg-[var(--theme-bg)] transition-colors duration-500 px-1.5 py-0.5 rounded">{s.stockCode}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <input type="text" placeholder="오늘의 투자 인사이트 제목..." value={selectedNote.title} onChange={(e) => setSelectedNote({...selectedNote, title: e.target.value})} className="w-full bg-transparent border-b border-[var(--theme-border)] transition-colors duration-500 text-3xl font-black text-white placeholder:text-slate-800 outline-none py-4 transition-all focus:border-indigo-500/50 tracking-tighter" />
                                            <div className="space-y-2">
                                                {/* CUSTOM TOOLBAR WITH TOOLTIPS */}
                                                <div className="flex flex-wrap items-center gap-1 p-2 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-t-2xl sticky top-0 z-30">
                                                    <button onClick={() => execCommand('bold')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="굵게 (Bold)"><Bold size={16} /></button>
                                                    <button onClick={() => execCommand('italic')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="기울임 (Italic)"><Italic size={16} /></button>
                                                    <button onClick={() => execCommand('underline')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="밑줄 (Underline)"><Underline size={16} /></button>
                                                    <div className="w-px h-4 bg-slate-800 mx-1" />
                                                    <select onChange={(e) => execCommand('fontSize', e.target.value)} className="bg-transparent text-[10px] text-slate-400 font-bold outline-none px-2 hover:text-white transition-colors cursor-pointer" title="글자 크기"><option value="1">Small</option><option value="3" selected>Normal</option><option value="5">Large</option><option value="7">Huge</option></select>
                                                    <div className="w-px h-4 bg-slate-800 mx-1" />
                                                    <button onClick={() => execCommand('foreColor', '#fbbf24')} className="p-2 hover:bg-white/10 rounded-lg text-amber-400 transition-colors" title="노란색 강조"><Palette size={16} /></button>
                                                    <button onClick={() => execCommand('foreColor', '#f87171')} className="p-2 hover:bg-white/10 rounded-lg text-rose-400 transition-colors" title="빨간색 강조"><Palette size={16} /></button>
                                                    <button onClick={() => execCommand('foreColor', '#ffffff')} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors" title="글자색 초기화"><Palette size={16} /></button>
                                                    <div className="w-px h-4 bg-slate-800 mx-1" />
                                                    <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="글머리 기호"><List size={16} /></button>
                                                    <button onClick={() => execCommand('insertHorizontalRule')} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="구분선"><Minus size={16} /></button>
                                                    <div className="w-px h-4 bg-slate-800 mx-1" />
                                                    <button onClick={() => fileInputRef.current.click()} className="p-2 hover:bg-indigo-500/20 rounded-lg text-indigo-400 hover:text-indigo-300 transition-all flex items-center gap-1 font-black text-[10px]" title="이미지 업로드"><ImageIcon size={16} /> IMG</button>
                                                </div>
                                                {/* PURE EDITABLE AREA (WHITE FONT) */}
                                                <div 
                                                    id="note-editor"
                                                    ref={editorRef} 
                                                    contentEditable 
                                                    suppressContentEditableWarning={true}
                                                    placeholder="여기에 통찰을 기록하세요..." 
                                                    className="w-full min-h-[600px] bg-[var(--theme-bg)] transition-colors duration-500/50 border-x border-b border-[var(--theme-border)] transition-colors duration-500 rounded-b-2xl p-8 outline-none text-white leading-relaxed font-medium text-lg shadow-inner custom-scrollbar overflow-y-auto" 
                                                    dangerouslySetInnerHTML={{ __html: selectedNote.content }} 
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-10 py-4 animate-in fade-in duration-700 text-white">
                                            <div className="flex flex-wrap items-center gap-4">
                                                <span className={classNames("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl ring-1 ring-white/10", categories.find(c => c.id === selectedNote.category)?.color)}>{categories.find(c => c.id === selectedNote.category)?.label}</span>
                                                {selectedNote.refCode && <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-widest border border-cyan-500/20 shadow-lg shadow-cyan-500/5">STOCK: {selectedNote.stockName ? `${selectedNote.stockName} (${selectedNote.refCode})` : selectedNote.refCode}</span>}
                                                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold ml-auto bg-[var(--theme-header)] transition-colors duration-500/50 px-4 py-1.5 rounded-full border border-[var(--theme-border)] transition-colors duration-500">
                                                    <span className="flex items-center gap-1.5"><Clock size={12} className="text-indigo-400" /> {new Date(selectedNote.createdAt).toLocaleString()}</span>
                                                    <span className="flex items-center gap-1.5"><Eye size={12} className="text-indigo-400" /> {selectedNote.viewCount} views</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4 text-center">
                                                <h2 className="text-5xl font-black text-white leading-tight tracking-tighter">{selectedNote.title}</h2>
                                                <div className="h-1.5 w-32 bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-full mx-auto shadow-lg shadow-indigo-500/20" />
                                            </div>
                                            <div className="bg-[var(--theme-header)] transition-colors duration-500/40 rounded-[40px] p-8 lg:p-16 border border-[var(--theme-border)] transition-colors duration-500/50 shadow-2xl min-h-[500px]">
                                                <div className="prose prose-invert prose-indigo max-w-none text-white leading-relaxed font-medium text-lg overflow-visible" dangerouslySetInnerHTML={{ __html: selectedNote.content }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-8">
                            <div className="relative"><div className="absolute inset-0 bg-indigo-500 blur-[120px] opacity-10 animate-pulse" /><div className="relative bg-[var(--theme-header)] transition-colors duration-500/50 p-12 rounded-[50px] border border-[var(--theme-border)] transition-colors duration-500/50 shadow-2xl rotate-1"><FileText size={120} className="text-indigo-500/20" /></div></div>
                            <div className="text-center space-y-3 relative"><h3 className="text-sm font-black uppercase tracking-[0.6em] text-indigo-400/40">Knowledge Vault</h3><p className="text-[11px] text-slate-600 font-bold uppercase tracking-tighter">Your private strategic data fortress</p></div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                [contenteditable]:empty:before { content: attr(placeholder); color: #334155; cursor: text; }
                .prose h2 { color: white !important; font-weight: 900; font-size: 2rem; margin-top: 3rem; margin-bottom: 1.5rem; border-left: 6px solid #4f46e5; padding-left: 1.5rem; background: linear-gradient(to right, #1e1b4b, transparent); padding-top: 8px; padding-bottom: 8px; }
                .prose p { margin-bottom: 1.8rem; line-height: 1.9; color: white !important; }
                .prose font[size="1"] { font-size: 0.75rem; }
                .prose font[size="3"] { font-size: 1.125rem; }
                .prose font[size="5"] { font-size: 1.5rem; color: white; font-weight: 800; }
                .prose font[size="7"] { font-size: 2.5rem; color: white; font-weight: 900; line-height: 1.2; }
                img { max-width: 100%; border-radius: 12px; margin: 15px 0; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            `}</style>
        </div>
    );
};

export default InvestmentJournalDesktop;
