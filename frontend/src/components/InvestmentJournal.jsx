import React, { useState, useEffect, useRef } from 'react';
import InvestmentJournalDesktop from './InvestmentJournal_Desktop';
import InvestmentJournalMobile from './InvestmentJournal_Mobile';

const InvestmentJournal = () => {
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setCategory] = useState('ALL');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    
    // 상태 보강
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [stockSearchResults, setStockSearchResults] = useState([]);
    const [showStockSearch, setShowStockSearch] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;
    const [notification, setNotification] = useState(null);
    const [notifType, setNotifType] = useState('SUCCESS');

    const editorRef = useRef(null);
    const fileInputRef = useRef(null);

    const categories = [
        { id: 'ALL', label: '전체', color: 'bg-slate-500' },
        { id: 'JOURNAL', label: '매매일지', color: 'bg-indigo-500' },
        { id: 'ANALYSIS', label: '종목분석', color: 'bg-emerald-500' },
        { id: 'STRATEGY', label: '투자전략', color: 'bg-rose-500' },
        { id: 'STUDY', label: '학습기록', color: 'bg-amber-500' },
        { id: 'GENERAL', label: '기타/끄적임', color: 'bg-cyan-500' },
    ];

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const showNotification = (msg, type = 'SUCCESS') => {
        setNotification(msg);
        setNotifType(type);
        setTimeout(() => setNotification(null), 3000);
    };

    const getApiUrl = (id = null) => {
        const base = 'api/dashboard/notes';
        return id ? `${base}/${id}` : base;
    };

    const fetchNotes = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(getApiUrl(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotes(data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const searchStocks = async (query) => {
        if (!query || query.length < 1) {
            setStockSearchResults([]);
            setShowStockSearch(false);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`api/stocks/search?keyword=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setStockSearchResults(data);
                setShowStockSearch(true);
            }
        } catch (error) {
            console.error('Stock search error:', error);
        }
    };

    const selectStock = (stock) => {
        setSelectedNote({
            ...selectedNote,
            refCode: stock.stockCode,
            stockName: stock.stockName
        });
        setShowStockSearch(false);
    };

    useEffect(() => { fetchNotes(); }, []);

    // [v34.90] 에디터 내용 실시간 싱크 함수
    const syncEditorContent = () => {
        if (editorRef.current) {
            const html = editorRef.current.innerHTML;
            setSelectedNote(prev => ({ ...prev, content: html }));
        }
    };

    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        syncEditorContent(); // 명령 실행 후 즉시 싱크
        if (editorRef.current) editorRef.current.focus();
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showNotification('이미지는 5MB 이하만 가능합니다.', 'WARNING');
                return;
            }
            
            setIsLoading(true);
            try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch('api/dashboard/notes/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    const imgUrl = data.url;
                    const imgTag = `<img src="${imgUrl}" style="max-width: 100%; border-radius: 12px; margin: 10px 0; border: 1px solid #334155; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />`;
                    
                    if (editorRef.current) {
                        editorRef.current.focus();
                        document.execCommand('insertHTML', false, imgTag);
                        syncEditorContent();
                    }
                } else {
                    showNotification('이미지 업로드에 실패했습니다.', 'ERROR');
                }
            } catch (error) {
                console.error('Upload error:', error);
                showNotification('서버 통신 오류가 발생했습니다.', 'ERROR');
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const handleSaveNote = async () => {
        // 최종 저장 전 한 번 더 싱크
        const content = editorRef.current ? editorRef.current.innerHTML : selectedNote.content;
        
        if (!selectedNote.title || !content || content === '<br>' || content.trim() === '') {
            showNotification('제목과 내용을 모두 입력해주세요.', 'WARNING');
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const isNew = !selectedNote.id;
            const method = isNew ? 'POST' : 'PUT';
            const url = isNew ? getApiUrl() : getApiUrl(selectedNote.id);

            const response = await fetch(url, {
                method,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...selectedNote, content })
            });

            if (response.ok) {
                const savedNote = await response.json();
                if (!savedNote.createdAt) savedNote.createdAt = new Date().toISOString();
                
                if (isNew) {
                    setNotes([savedNote, ...notes]);
                    showNotification('저장되었습니다.');
                } else {
                    setNotes(prev => prev.map(n => n.id === savedNote.id ? savedNote : n));
                    showNotification('수정되었습니다.');
                }
                setIsEditing(false);
                setSelectedNote(savedNote);
            } else {
                showNotification('서버 저장에 실패했습니다.', 'ERROR');
            }
        } catch (error) {
            console.error('Save error:', error);
            showNotification('통신 오류가 발생했습니다.', 'ERROR');
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = (id) => {
        setNoteToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(getApiUrl(noteToDelete), {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setNotes(notes.filter(n => n.id !== noteToDelete));
                if (selectedNote?.id === noteToDelete) setSelectedNote(null);
                showNotification('삭제되었습니다.');
            }
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsDeleteModalOpen(false);
            setNoteToDelete(null);
        }
    };

    const createNewNote = () => {
        const newNote = { title: '', content: '', category: 'GENERAL', isImportant: false, refCode: '', stockName: '' };
        setSelectedNote(newNote);
        setIsEditing(true);
    };

    const handleEditStart = () => {
        setIsEditing(true);
    };

    const filteredNotes = notes.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (n.content && n.content.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === 'ALL' || n.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const totalPages = Math.ceil(filteredNotes.length / pageSize);
    const paginatedNotes = filteredNotes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const commonProps = {
        notes, categories, selectedNote, setSelectedNote, 
        isEditing, setIsEditing, handleSaveNote, confirmDelete, 
        searchTerm, setSearchTerm, filterCategory, setCategory,
        currentPage, setCurrentPage, totalPages, paginatedNotes,
        createNewNote, handleEditStart, editorRef, fileInputRef, execCommand, 
        notification, notifType, isLoading,
        searchStocks, stockSearchResults, showStockSearch, setShowStockSearch, selectStock,
        isDeleteModalOpen, setIsDeleteModalOpen, handleDeleteNote, handleImageUpload,
        syncEditorContent // [v34.90] 싱크 함수 전달
    };

    if (isMobile) {
        return <InvestmentJournalMobile {...commonProps} />;
    }

    return <InvestmentJournalDesktop {...commonProps} />;
};

export default InvestmentJournal;
