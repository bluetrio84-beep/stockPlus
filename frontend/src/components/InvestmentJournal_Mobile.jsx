import React, { useState } from 'react';
import { 
    Book, Search, Plus, Save, Trash2, Star, ChevronLeft, ChevronRight,
    Calendar, Tag, Eye, Edit3, Clock, FileText, X,
    Bold, Italic, Underline, List, ListOrdered, Image as ImageIcon, AlertTriangle, CheckCircle2, AlertCircle, Palette, Minus
} from 'lucide-react';
import classNames from 'classnames';

const InvestmentJournalMobile = ({ 
    notes, categories, selectedNote, setSelectedNote, onFetchDetail,
    isEditing, setIsEditing, handleSaveNote, confirmDelete, 
    searchTerm, setSearchTerm, filterCategory, setCategory,
    currentPage, setCurrentPage, totalPages, paginatedNotes,
    createNewNote, handleEditStart, editorRef, fileInputRef, quillRef, execCommand, 
    notification, notifType, isLoading,
    searchStocks, stockSearchResults, showStockSearch, selectStock,
    isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteNote, handleImageUpload
}) => {
    const [viewMode, setViewMode] = useState('LIST');

    const onNoteClick = (note) => {
        onFetchDetail(note); // 상세 정보 조회 및 조회수 증가
        setViewMode('VIEW');
    };

    const onCreateClick = () => {
        createNewNote();
        setViewMode('FORM');
    };

    const onEditClick = () => {
        handleEditStart();
        setViewMode('FORM');
    };

    const onBackToList = () => {
        setViewMode('LIST');
        setSelectedNote(null);
        setIsEditing(false);
    };

    const onSave = async () => {
        await handleSaveNote();
    };

    const filteredNotes = notes.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === 'ALL' || n.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col h-full bg-[var(--theme-bg)] transition-colors duration-500 text-[var(--theme-text)] font-sans overflow-hidden relative">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md px-6 animate-in fade-in duration-200">
                    <div className="bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-[32px] p-8 w-full shadow-2xl">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2"><AlertTriangle size={32} /></div>
                            <h3 className="text-xl font-black text-[var(--theme-text)] transition-colors">기록을 삭제할까요?</h3>
                            <p className="text-sm text-slate-500 font-bold leading-relaxed">삭제된 데이터는 복구할 수 없습니다.</p>
                            <div className="flex gap-3 w-full mt-6">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs transition-all">취소</button>
                                <button onClick={() => { handleDeleteNote(); onBackToList(); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs shadow-lg transition-all">삭제</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300 w-[90%] max-w-sm">
                    <div className={classNames(
                        "px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-center gap-3 font-black text-xs ring-4",
                        notifType === 'SUCCESS' ? "bg-emerald-500 text-white ring-emerald-500/20" : 
                        notifType === 'WARNING' ? "bg-amber-500 text-white ring-amber-500/20" : "bg-rose-500 text-white ring-rose-500/20"
                    )}>
                        {notifType === 'SUCCESS' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        {notification}
                    </div>
                </div>
            )}

            {viewMode === 'LIST' && (
                <div className="flex flex-col h-full animate-in fade-in duration-300">
                    <header className="shrink-0 h-14 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30 transition-colors">
                        <div className="flex items-center gap-2"><Book size={18} className="text-indigo-400" /><h1 className="text-sm font-black uppercase tracking-widest text-[var(--theme-text)] italic transition-colors">Journal</h1></div>
                        <button onClick={onCreateClick} className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg active:scale-90"><Plus size={18} /></button>
                    </header>
                    <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-20">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input type="text" placeholder="기록 수색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[var(--theme-text)] outline-none font-bold placeholder:text-slate-700 transition-colors" />
                        </div>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => setCategory(cat.id)} className={classNames("px-3 py-1.5 rounded-lg text-[10px] font-black shrink-0 transition-all border whitespace-nowrap", filterCategory === cat.id ? `${cat.color} text-white border-transparent shadow-lg` : "bg-[var(--theme-header)] transition-colors duration-500 text-slate-500 border-[var(--theme-border)] transition-colors duration-500")}>{cat.label}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {paginatedNotes.map(note => (
                                <div key={note.id} onClick={() => onNoteClick(note)} className="bg-[var(--theme-header)] transition-colors duration-500/50 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl p-4 active:bg-white/5 transition-all relative overflow-hidden transition-colors shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={classNames("px-2 py-0.5 rounded-[4px] text-[8px] font-black text-white", categories.find(c => c.id === note.category)?.color || 'bg-slate-500')}>{categories.find(c => c.id === note.category)?.label}</span>
                                        {note.isImportant && <Star size={12} className="fill-amber-400 text-amber-400" />}
                                    </div>
                                    <h3 className="text-sm font-black text-[var(--theme-text)] truncate mb-1 transition-colors">{note.title}</h3>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold mt-2">
                                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(note.createdAt).toLocaleDateString()}</span>
                                        {note.refCode && <span className="text-cyan-600 font-black tracking-tighter truncate max-w-[150px] bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">{note.stockName ? `${note.stockName} (${note.refCode})` : note.refCode}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* [v16.13] 모바일 페이지네이션 컨트롤 바 */}
                        {totalPages > 1 && (
                            <div className="mt-8 mb-4 flex items-center justify-center gap-4 transition-colors">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1}
                                    className="p-3 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl text-slate-400 disabled:opacity-20 active:scale-90 transition-all"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                
                                <div className="px-5 py-2 bg-[var(--theme-point)]/10 rounded-full border border-[var(--theme-point)]/20">
                                    <span className="text-xs font-black text-[var(--theme-point)] uppercase tracking-widest">
                                        {currentPage} <span className="text-slate-400 mx-1">/</span> {totalPages}
                                    </span>
                                </div>

                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={currentPage === totalPages}
                                    className="p-3 bg-[var(--theme-header)] border border-[var(--theme-border)] rounded-xl text-slate-400 disabled:opacity-20 active:scale-90 transition-all"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'VIEW' && selectedNote && (
                <div className="flex flex-col h-full bg-[var(--theme-bg)] transition-colors duration-500 animate-in slide-in-from-right-full duration-300">
                    <header className="shrink-0 h-14 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-header)] transition-colors duration-500/80 flex items-center justify-between px-4 sticky top-0 z-30 transition-colors">
                        <button onClick={onBackToList} className="p-2 -ml-2 text-slate-400 active:text-[var(--theme-text)]"><ChevronLeft size={24} /></button>
                        <div className="flex gap-2">
                            <button onClick={() => confirmDelete(selectedNote.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                            <button onClick={onEditClick} className="p-2 text-indigo-600 hover:text-indigo-500 transition-colors"><Edit3 size={18} /></button>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-10 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className={classNames("px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest", categories.find(c => c.id === selectedNote.category)?.color)}>{categories.find(c => c.id === selectedNote.category)?.label}</span>
                            {selectedNote.refCode && <span className="text-cyan-600 text-[10px] font-black bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 shadow-lg shadow-cyan-500/5">STOCK: {selectedNote.stockName ? `${selectedNote.stockName} (${selectedNote.refCode})` : selectedNote.refCode}</span>}
                        </div>
                        <h2 className="text-3xl font-black text-[var(--theme-text)] leading-tight tracking-tight transition-colors">{selectedNote.title}</h2>
                        <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(selectedNote.createdAt).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Eye size={12} /> {selectedNote.viewCount} views</span>
                        </div>
                        <div className="prose prose-invert max-w-none text-[var(--theme-text)] leading-relaxed text-base font-medium pb-10 transition-colors" dangerouslySetInnerHTML={{ __html: selectedNote.content }} />
                    </div>
                </div>
            )}

            {viewMode === 'FORM' && selectedNote && (
                <div className="flex flex-col h-full bg-[var(--theme-header)] transition-colors duration-500">
                    <header className="shrink-0 h-14 border-b border-[var(--theme-border)] transition-colors duration-500 bg-[var(--theme-bg)] transition-colors duration-500/80 flex items-center justify-between px-4 sticky top-0 z-30 transition-colors">
                        <button onClick={() => setViewMode(selectedNote.id ? 'VIEW' : 'LIST')} className="p-2 -ml-2 text-slate-400 active:text-[var(--theme-text)]"><X size={24} /></button>
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 transition-colors">{selectedNote.id ? '수정' : '기록'}</h2>
                        <button onClick={onSave} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-black shadow-lg active:scale-95">저장</button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10 transition-colors">
                        <div className="grid grid-cols-2 gap-3 transition-colors">
                            <select 
                                value={selectedNote.category} 
                                onChange={(e) => {
                                    const html = editorRef.current ? editorRef.current.innerHTML : selectedNote.content;
                                    setSelectedNote({...selectedNote, category: e.target.value, content: html});
                                }} 
                                className="bg-[var(--theme-bg)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl px-3 py-2 text-[11px] text-[var(--theme-text)] font-bold outline-none transition-colors"
                            >
                                {categories.filter(c => c.id !== 'ALL').map(c => <option key={c.id} value={c.id} className="text-black">{c.label}</option>)}
                            </select>
                            <div className="relative transition-colors">
                                <input 
                                    type="text" 
                                    placeholder="종목명/코드" 
                                    value={selectedNote.stockName ? `${selectedNote.stockName} (${selectedNote.refCode})` : selectedNote.refCode} 
                                    onChange={(e) => { 
                                        const v = e.target.value; 
                                        const html = editorRef.current ? editorRef.current.innerHTML : selectedNote.content;
                                        setSelectedNote({...selectedNote, refCode: v, stockName: '', content: html}); 
                                        searchStocks(v); 
                                    }} 
                                    onFocus={() => setShowStockSearch(true)} 
                                    className="w-full bg-[var(--theme-bg)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-xl px-3 py-2 text-[11px] text-[var(--theme-text)] font-mono font-black outline-none transition-colors" 
                                />
                                {showStockSearch && stockSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--theme-header)] transition-colors duration-500 border border-[var(--theme-border)] transition-colors duration-500 rounded-2xl shadow-2xl z-[50] overflow-hidden max-h-40 overflow-y-auto transition-colors">
                                        {stockSearchResults.slice(0, 5).map(s => (
                                            <div key={s.stockCode} onClick={() => selectStock(s)} className="px-4 py-3 hover:bg-[var(--theme-bg)]/50 cursor-pointer flex justify-between items-center border-b border-[var(--theme-border)] transition-colors duration-500 last:border-none transition-colors">
                                                <span className="text-xs font-black text-[var(--theme-text)] transition-colors">{s.stockName}</span>
                                                <span className="text-[10px] font-mono text-slate-500 bg-[var(--theme-bg)] transition-colors duration-500 px-1 rounded transition-colors">{s.stockCode}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <input 
                            type="text" 
                            placeholder="제목..." 
                            value={selectedNote.title} 
                            onChange={(e) => {
                                const html = editorRef.current ? editorRef.current.innerHTML : selectedNote.content;
                                setSelectedNote({...selectedNote, title: e.target.value, content: html});
                            }} 
                            className="w-full bg-transparent border-b border-[var(--theme-border)] transition-colors duration-500 text-xl font-black text-[var(--theme-text)] outline-none py-2 placeholder:text-slate-700 transition-colors" 
                        />
                        
                        <div className="flex flex-wrap items-center gap-1 p-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-t-xl sticky top-0 z-20 shadow-sm transition-colors duration-500">
                            <div className="flex items-center gap-1 shrink-0">
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('bold')} className="p-2 text-slate-400 active:text-[var(--theme-point)] active:bg-[var(--theme-point)]/10 rounded-lg transition-all" title="Bold"><Bold size={16} /></button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('italic')} className="p-2 text-slate-400 active:text-[var(--theme-point)] active:bg-[var(--theme-point)]/10 rounded-lg transition-all" title="Italic"><Italic size={16} /></button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('underline')} className="p-2 text-slate-400 active:text-[var(--theme-point)] active:bg-[var(--theme-point)]/10 rounded-lg transition-all" title="Underline"><Underline size={16} /></button>
                            </div>
                            
                            <div className="w-px h-4 bg-[var(--theme-border)] mx-1 shrink-0" />
                            
                            <div className="flex items-center gap-1 shrink-0">
                                <select 
                                    onChange={(e) => execCommand('fontSize', e.target.value)} 
                                    className="bg-[var(--theme-bg)] text-[10px] text-[var(--theme-text)] font-black outline-none px-2 h-8 border border-[var(--theme-border)] rounded-lg transition-colors cursor-pointer"
                                >
                                    <option value="1" className="text-black">Small</option>
                                    <option value="3" selected className="text-black">Normal</option>
                                    <option value="5" className="text-black">Large</option>
                                    <option value="7" className="text-black">Huge</option>
                                </select>
                            </div>

                            <div className="w-px h-4 bg-[var(--theme-border)] mx-1 shrink-0" />

                            <div className="flex items-center gap-1 shrink-0">
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('foreColor', '#fbbf24')} className="p-2 text-amber-500 active:bg-amber-500/10 rounded-lg transition-all"><Palette size={16} /></button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('foreColor', '#f87171')} className="p-2 text-rose-500 active:bg-rose-500/10 rounded-lg transition-all"><Palette size={16} /></button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('foreColor', 'var(--theme-text)')} className="p-2 text-[var(--theme-text)] active:bg-slate-500/10 rounded-lg transition-all"><Palette size={16} /></button>
                            </div>

                            <div className="w-px h-4 bg-[var(--theme-border)] mx-1 shrink-0" />

                            <div className="flex items-center gap-1 shrink-0">
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertUnorderedList')} className="p-2 text-slate-400 active:text-[var(--theme-text)] rounded-lg" title="List"><List size={16} /></button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertOrderedList')} className="p-2 text-slate-400 active:text-[var(--theme-text)] rounded-lg" title="Ordered List"><ListOrdered size={16} /></button>
                                <button onMouseDown={(e) => e.preventDefault()} onClick={() => execCommand('insertHorizontalRule')} className="p-2 text-slate-400 active:text-[var(--theme-text)] rounded-lg" title="Divider"><Minus size={16} /></button>
                            </div>

                            <div className="w-px h-4 bg-[var(--theme-border)] mx-1 shrink-0" />

                            <button onClick={() => fileInputRef.current.click()} className="p-2 text-indigo-600 font-black text-[10px] flex items-center gap-1 shrink-0 active:scale-90 transition-all" title="Image"><ImageIcon size={16} /> IMG</button>
                        </div>
                        <div 
                            ref={editorRef} 
                            contentEditable 
                            suppressContentEditableWarning={true}
                            placeholder="여기에 통찰을 기록하세요..." 
                            className="w-full min-h-[400px] bg-[var(--theme-bg)] transition-colors duration-500/50 border-x border-b border-[var(--theme-border)] transition-colors duration-500 rounded-b-xl p-4 outline-none text-[var(--theme-text)] text-sm leading-relaxed ql-editor transition-colors" 
                            dangerouslySetInnerHTML={{ __html: selectedNote.content }} 
                        />
                    </div>
                </div>
            )}
            <style>{`
                [contenteditable]:empty:before { content: attr(placeholder); color: #64748b; cursor: text; }
                .ql-editor ul { list-style-type: disc !important; padding-left: 1.2rem !important; margin-bottom: 1rem !important; }
                .ql-editor ol { list-style-type: decimal !important; padding-left: 1.2rem !important; margin-bottom: 1rem !important; }
                .ql-editor li { display: list-item !important; margin-bottom: 0.4rem !important; color: inherit !important; }
                .ql-editor font[size="1"] { font-size: 0.75rem !important; }
                .ql-editor font[size="3"] { font-size: 1rem !important; }
                .ql-editor font[size="5"] { font-size: 1.25rem !important; font-weight: 800 !important; }
                .ql-editor font[size="7"] { font-size: 1.75rem !important; font-weight: 900 !important; }
                .ql-editor img { max-width: 100%; border-radius: 8px; margin: 10px 0; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                .ql-editor p { margin-bottom: 1rem; color: inherit !important; }
            `}</style>
        </div>
    );
};

export default InvestmentJournalMobile;
