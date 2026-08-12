import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, Sparkles, Copy, Check, Calendar, RefreshCw, Trash2, ExternalLink, Tag, Eye
} from 'lucide-react';

const BlogView = ({ theme, onShowToast }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewTab, setViewTab] = useState('html'); // 'html' | 'markdown' | 'seo'
  const [copied, setCopied] = useState(false);
  const [targetDate, setTargetDate] = useState('');

  // 1. Fetch Posts List
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/blog/posts');
      if (res.data.success) {
        setPosts(res.data.data);
        if (res.data.data.length > 0 && !selectedPost) {
          fetchPostDetail(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch blog posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Single Post Detail
  const fetchPostDetail = async (postId) => {
    try {
      const res = await axios.get(`/api/blog/posts/${postId}`);
      if (res.data.success) {
        setSelectedPost(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch post detail:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // 3. Generate New Post
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const url = targetDate 
        ? `/api/blog/generate?target_date=${encodeURIComponent(targetDate)}`
        : '/api/blog/generate';
      const res = await axios.post(url);
      if (res.data.success) {
        if (onShowToast) onShowToast("🎉 퀀트 포스팅이 성공적으로 생성되었습니다!");
        await fetchPosts();
        setSelectedPost(res.data.data);
      }
    } catch (err) {
      console.error("Failed to generate post:", err);
      if (onShowToast) onShowToast("❌ 포스팅 생성 중 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // 4. Copy HTML / Markdown
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    if (onShowToast) onShowToast("📋 클립보드에 복사되었습니다! (네이버/티스토리에 붙여넣으세요)");
    setTimeout(() => setCopied(false), 2000);
  };

  // 5. Delete Post
  const handleDelete = async (postId) => {
    if (!window.confirm("이 포스팅을 삭제하시겠습니까?")) return;
    try {
      const res = await axios.delete(`/api/blog/posts/${postId}`);
      if (res.data.success) {
        if (onShowToast) onShowToast("🗑️ 포스팅이 삭제되었습니다.");
        setSelectedPost(null);
        fetchPosts();
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  // 6. Mark Published
  const handlePublish = async (postId) => {
    try {
      const res = await axios.put(`/api/blog/posts/${postId}/publish`);
      if (res.data.success) {
        if (onShowToast) onShowToast("✅ 발행 완료 상태로 변경되었습니다.");
        fetchPostDetail(postId);
        fetchPosts();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Controller */}
      <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl`}>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${theme.title} flex items-center gap-2`}>
              Quant Stock Auto-Blogger Engine
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">v1.0 ONLINE</span>
            </h2>
            <p className={`text-xs ${theme.desc} mt-1`}>
              StockPlus 실시간 WICS 80개 업종 / 상한가 테마 데이터를 기반으로 SEO 최적화 포스팅을 자동 생성합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>퀀트 데이터 분석 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>오늘 자 포스팅 즉시 생성</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Left List (1/3) & Right Preview (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Post List */}
        <div className={`lg:col-span-4 ${theme.card} p-5 rounded-3xl border ${theme.border} flex flex-col h-[700px]`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h3 className={`font-bold text-sm ${theme.title} flex items-center gap-2`}>
              <Calendar className="w-4 h-4 text-blue-400" />
              생성된 포스팅 히스토리 ({posts.length})
            </h3>
            <button onClick={fetchPosts} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {posts.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                생성된 포스팅이 없습니다.<br />위 상단 '포스팅 즉시 생성' 버튼을 눌러주세요!
              </div>
            ) : (
              posts.map((post) => {
                const isSelected = selectedPost?.id === post.id;
                return (
                  <div
                    key={post.id}
                    onClick={() => fetchPostDetail(post.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500/50 shadow-md'
                        : `${theme.card} ${theme.border} hover:border-slate-600`
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                      <span>{post.post_date}</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        post.status === 'PUBLISHED'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {post.status}
                      </span>
                    </div>
                    <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isSelected ? 'text-blue-400' : theme.title}`}>
                      {post.title}
                    </h4>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Preview & HTML Viewer */}
        <div className={`lg:col-span-8 ${theme.card} p-6 rounded-3xl border ${theme.border} flex flex-col h-[700px]`}>
          {selectedPost ? (
            <div className="flex flex-col h-full">
              {/* Header Actions */}
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewTab('html')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      viewTab === 'html' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    네이버/티스토리 HTML
                  </button>
                  <button
                    onClick={() => setViewTab('markdown')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      viewTab === 'markdown' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    마크다운 원문
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(viewTab === 'html' ? selectedPost.html_content : selectedPost.markdown_content)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{viewTab === 'html' ? 'HTML 복사' : '마크다운 복사'}</span>
                  </button>

                  {selectedPost.status !== 'PUBLISHED' && (
                    <button
                      onClick={() => handlePublish(selectedPost.id)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      발행 완료
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(selectedPost.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Window */}
              <div className="flex-1 overflow-y-auto mt-4 p-4 rounded-2xl bg-white/5 border border-white/5 font-sans">
                {viewTab === 'html' ? (
                  <div 
                    className="prose max-w-none text-slate-200"
                    dangerouslySetInnerHTML={{ __html: selectedPost.html_content }}
                  />
                ) : (
                  <pre className="text-xs text-cyan-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedPost.markdown_content}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
              <Eye className="w-12 h-12 mb-3 text-slate-600" />
              좌측 목록에서 포스팅을 선택하여 미리보기를 확인하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogView;
