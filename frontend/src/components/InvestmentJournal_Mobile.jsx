import React, { useState } from 'react';
import { 
    Book, Search, Plus, Save, Trash2, Star, ChevronLeft, 
    Calendar, Tag, Eye, Edit3, Clock, FileText, X,
    Bold, Italic, Underline, Image as ImageIcon, AlertTriangle, CheckCircle2, AlertCircle, Palette, Minus
} from 'lucide-react';
import classNames from 'classnames';

const InvestmentJournalMobile = ({ 
    notes, categories, selectedNote, setSelectedNote, 
    isEditing, setIsEditing, handleSaveNote, confirmDelete, 
    searchTerm, setSearchTerm, filterCategory, setCategory,
    createNewNote, handleEditStart, editorRef, fileInputRef, quillRef, execCommand, 
    notification, notifType, isLoading,
    searchStocks, stockSearchResults, showStockSearch, setShowStockSearch, selectStock,
    isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteNote, handleImageUpload,
    syncEditorContent // [v35.20] 누락된 Props 주입
}) => {
    const [viewMode, setViewMode] = useState('LIST');

    const onNoteClick = (note) => {
        setSelectedNote(note);
        setIsEditing(false);
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
        // Notification is handled by the parent
    };

    const filteredNotes = notes.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === 'ALL' || n.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-sans overflow-hidden relative">
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md px-6 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 w-full shadow-2xl">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2"><AlertTriangle size={32} /></div>
                            <h3 className="text-xl font-black text-white">기록을 삭제할까요?</h3>
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
                    <header className="shrink-0 h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
                        <div className="flex items-center gap-2"><Book size={18} className="text-indigo-400" /><h1 className="text-sm font-black uppercase tracking-widest text-white italic">Journal</h1></div>
                        <button onClick={onCreateClick} className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg active:scale-90"><Plus size={18} /></button>
                    </header>
                    <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-20">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input type="text" placeholder="기록 수색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none font-bold placeholder:text-slate-700" />
                        </div>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                            {categories.map(cat => (
                                <button key={cat.id} onClick={() => setCategory(cat.id)} className={classNames("px-3 py-1.5 rounded-lg text-[10px] font-black shrink-0 transition-all border whitespace-nowrap", filterCategory === cat.id ? `${cat.color} text-white border-transparent shadow-lg` : "bg-slate-900 text-slate-500 border-slate-800")}>{cat.label}</button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {filteredNotes.map(note => (
                                <div key={note.id} onClick={() => onNoteClick(note)} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 active:bg-white/5 transition-all relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={classNames("px-2 py-0.5 rounded-[4px] text-[8px] font-black text-white", categories.find(c => c.id === note.category)?.color || 'bg-slate-500')}>{categories.find(c => c.id === note.category)?.label}</span>
                                        {note.isImportant && <Star size={12} className="fill-amber-400 text-amber-400" />}
                                    </div>
                                    <h3 className="text-sm font-black text-white truncate mb-1">{note.title}</h3>
                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold mt-2">
                                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(note.createdAt).toLocaleDateString()}</span>
                                        {note.refCode && <span className="text-cyan-400 font-black tracking-tighter truncate max-w-[150px] bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/10">{note.stockName ? `${note.stockName} (${note.refCode})` : note.refCode}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'VIEW' && selectedNote && (
                <div className="flex flex-col h-full bg-slate-950 animate-in slide-in-from-right-full duration-300">
                    <header className="shrink-0 h-14 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between px-4 sticky top-0 z-30">
                        <button onClick={onBackToList} className="p-2 -ml-2 text-slate-400 active:text-white"><ChevronLeft size={24} /></button>
                        <div className="flex gap-2">
                            <button onClick={() => confirmDelete(selectedNote.id)} className="p-2 text-slate-500 active:text-rose-500"><Trash2 size={18} /></button>
                            <button onClick={onEditClick} className="p-2 text-indigo-400 active:text-white"><Edit3 size={18} /></button>
                        </div>
                    </header>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-10">
                        <div className="flex items-center gap-3">
                            <span className={classNames("px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest", categories.find(c => c.id === selectedNote.category)?.color)}>{categories.find(c => c.id === selectedNote.category)?.label}</span>
                            {selectedNote.refCode && <span className="text-cyan-400 text-[10px] font-black bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20 shadow-lg shadow-cyan-500/5">STOCK: {selectedNote.stockName ? `${selectedNote.stockName} (${selectedNote.refCode})` : selectedNote.refCode}</span>}
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight tracking-tight">{selectedNote.title}</h2>
                        <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(selectedNote.createdAt).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Eye size={12} /> {selectedNote.viewCount} views</span>
                        </div>
                        <div className="prose prose-invert max-w-none text-white leading-relaxed text-base font-medium pb-10" dangerouslySetInnerHTML={{ __html: selectedNote.content }} />
                    </div>
                </div>
            )}

            {viewMode === 'FORM' && selectedNote && (
                <div className="flex flex-col h-full bg-slate-900 animate-in slide-in-from-bottom-full duration-400">
                    <header className="shrink-0 h-14 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between px-4 sticky top-0 z-30">
                        <button onClick={() => setViewMode(selectedNote.id ? 'VIEW' : 'LIST')} className="p-2 -ml-2 text-slate-400 active:text-white"><X size={24} /></button>
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{selectedNote.id ? '수정' : '기록'}</h2>
                        <button onClick={onSave} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-black shadow-lg active:scale-90">저장</button>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
                        <div className="grid grid-cols-2 gap-3">
                            <select value={selectedNote.category} onChange={(e) => setSelectedNote({...selectedNote, category: e.target.value})} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white font-bold outline-none">{categories.filter(c => c.id !== 'ALL').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                            <div className="relative">
                                <input type="text" placeholder="종목명/코드" value={selectedNote.stockName ? `${selectedNote.stockName} (${selectedNote.refCode})` : selectedNote.refCode} onChange={(e) => { const v = e.target.value; setSelectedNote({...selectedNote, refCode: v, stockName: ''}); searchStocks(v); }} onFocus={() => setShowStockSearch(true)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-white font-mono font-black outline-none" />
                                {showStockSearch && stockSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[50] overflow-hidden max-h-40 overflow-y-auto">
                                        {stockSearchResults.slice(0, 5).map(s => (
                                            <div key={s.stockCode} onClick={() => selectStock(s)} className="px-4 py-3 hover:bg-white/10 cursor-pointer flex justify-between items-center border-b border-slate-800 last:border-none">
                                                <span className="text-xs font-black text-white">{s.stockName}</span>
                                                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1 rounded">{s.stockCode}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <input type="text" placeholder="제목..." value={selectedNote.title} onChange={(e) => setSelectedNote({...selectedNote, title: e.target.value})} className="w-full bg-transparent border-b border-slate-800 text-xl font-black text-white outline-none py-2 placeholder:text-slate-700" />
                        
                        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-t-xl sticky top-0 z-20 overflow-x-auto no-scrollbar">
                            <button onClick={() => execCommand('bold')} className="p-2 text-slate-400 active:text-white" title="Bold"><Bold size={16} /></button>
                            <button onClick={() => execCommand('italic')} className="p-2 text-slate-400 active:text-white" title="Italic"><Italic size={16} /></button>
                            <button onClick={() => execCommand('foreColor', '#fbbf24')} className="p-2 text-amber-400" title="Highlight"><Palette size={16} /></button>
                            <button onClick={() => fileInputRef.current.click()} className="p-2 text-indigo-400 active:text-white" title="Image"><ImageIcon size={16} /></button>
                        </div>
                        <div 
                            ref={editorRef} 
                            contentEditable 
                            onInput={syncEditorContent}
                            placeholder="여기에 통찰을 기록하세요..." 
                            className="w-full min-h-[400px] bg-slate-950/50 border-x border-b border-slate-800 rounded-b-xl p-4 outline-none text-white text-sm leading-relaxed ql-editor" 
                            dangerouslySetInnerHTML={{ __html: selectedNote.content }} 
                        />
                    </div>
                </div>
            )}
            <style>{`
                [contenteditable]:empty:before { content: attr(placeholder); color: #334155; cursor: text; }
                .ql-editor img { max-width: 100%; border-radius: 8px; margin: 10px 0; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
                .ql-editor p { margin-bottom: 1rem; color: white !important; }
            `}</style>
        </div>
    );
};

export default InvestmentJournalMobile;
