import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FileText, Sparkles, Copy, Check, Calendar, RefreshCw, Trash2, Eye,
  Cpu, AlertCircle, CheckCircle, Clock
} from 'lucide-react';

// ── Harness Task Status Badge ─────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    PENDING:  { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'PENDING',  Icon: Clock },
    RUNNING:  { color: 'bg-blue-500/20   text-blue-400   border-blue-500/30',   label: 'RUNNING',  Icon: Cpu },
    RETRY:    { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'RETRY',    Icon: RefreshCw },
    SUCCESS:  { color: 'bg-green-500/20  text-green-400  border-green-500/30',  label: 'SUCCESS',  Icon: CheckCircle },
    FAILED:   { color: 'bg-red-500/20    text-red-400    border-red-500/30',    label: 'FAILED',   Icon: AlertCircle },
    READY:    { color: 'bg-green-500/20  text-green-400  border-green-500/30',  label: 'READY',    Icon: CheckCircle },
    PUBLISHED:{ color: 'bg-cyan-500/20   text-cyan-400   border-cyan-500/30',   label: 'PUBLISHED',Icon: CheckCircle },
    DRAFT:    { color: 'bg-slate-500/20  text-slate-400  border-slate-500/30',  label: 'DRAFT',    Icon: Clock },
  };
  const cfg = map[status] || map.DRAFT;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

// ── Harness 3-Step Pipeline Visualizer ───────────────────
const PIPELINE_STEPS = [
  { key: 'BLOG_GENERATE',    label: 'STEP 1\nQUANT DATA\nGENERATE',    icon: '📡' },
  { key: 'BLOG_SEO_ENHANCE', label: 'STEP 2\nSEO\nENHANCE',            icon: '🤖' },
  { key: 'BLOG_PUBLISH',     label: 'STEP 3\nHARNESS\nPUBLISH',        icon: '✅' },
];

const WorkerProgress = ({ taskId, onComplete, onError }) => {
  const [log, setLog]               = useState([]);
  const [taskStatus, setTaskStatus] = useState('PENDING');
  const [currentStep, setCurrentStep] = useState(null); // 현재 실행 중인 step key
  const [doneSteps, setDoneSteps]   = useState([]);     // 완료된 step keys
  const pollRef                     = useRef(null);
  const seenTaskIds                 = useRef(new Set([taskId]));

  const addLog = (text, type = 'INFO') =>
    setLog(prev => [...prev, { time: new Date().toLocaleTimeString(), text, type }]);

  useEffect(() => {
    if (!taskId) return;
    addLog(`[HARNESS WORKER] Task #${taskId} queued → Sandbox isolation active`, 'INFO');
    setCurrentStep('BLOG_GENERATE');

    const poll = async () => {
      try {
        // 현재 & 체이닝된 모든 task_id 폴링
        for (const tid of seenTaskIds.current) {
          const res = await axios.get(`/api/blog/task/${tid}`);
          const { status, post, error_log } = res.data;

          if (status === 'RUNNING' && !doneSteps.includes(`task_${tid}`)) {
            const stepGuess = tid === taskId ? 'BLOG_GENERATE'
              : doneSteps.includes('BLOG_GENERATE') ? 'BLOG_SEO_ENHANCE'
              : 'BLOG_PUBLISH';
            setCurrentStep(stepGuess);
            addLog(`[KAIROS] Task #${tid} RUNNING → ${stepGuess} step`, 'PROCESS');
          }

          if (status === 'SUCCESS') {
            if (!doneSteps.includes(`task_${tid}`)) {
              setDoneSteps(prev => [...prev, `task_${tid}`]);
              if (tid === taskId) {
                addLog('[BLOG] GENERATE done → post_id obtained. Chaining SEO_ENHANCE...', 'SUCCESS');
                setCurrentStep('BLOG_SEO_ENHANCE');
              }
              if (post) {
                // BLOG_PUBLISH 완료
                clearInterval(pollRef.current);
                setCurrentStep(null);
                setDoneSteps(['BLOG_GENERATE', 'BLOG_SEO_ENHANCE', 'BLOG_PUBLISH']);
                addLog(`[HARNESS] ✅ Full 3-step pipeline COMPLETE: "${post.title}"`, 'SUCCESS');
                addLog('[SYSTEM] Harness Worker nominal. Sandbox cleared.', 'INFO');
                onComplete(post);
                return;
              }
            }
          } else if (status === 'FAILED') {
            clearInterval(pollRef.current);
            addLog(`[AI SELF-CORRECTION] Recovery failed: ${error_log || 'unknown error'}`, 'ERROR');
            onError(error_log);
            return;
          } else if (status === 'RETRY') {
            addLog('[KAIROS] Error detected. AI Self-Correction initiating retry...', 'WARNING');
          }
        }

        // 체이닝 task (SEO_ENHANCE, PUBLISH)은 task_queue에서 직접 확인
        const queueRes = await axios.get(`/api/blog/pipeline-tasks?root_task_id=${taskId}`).catch(() => null);
        if (queueRes?.data?.task_ids) {
          queueRes.data.task_ids.forEach(id => seenTaskIds.current.add(id));
        }

      } catch (e) {
        console.error('Poll error:', e);
      }
    };

    pollRef.current = setInterval(poll, 1800);
    return () => clearInterval(pollRef.current);
  }, [taskId]);

  const logColors = {
    INFO: 'text-slate-400', PROCESS: 'text-blue-400',
    SUCCESS: 'text-green-400', ERROR: 'text-red-400', WARNING: 'text-yellow-400'
  };

  return (
    <div className="mt-4 space-y-3">
      {/* 3-Step Pipeline Visual */}
      <div className="flex items-center gap-0">
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone    = doneSteps.includes(step.key);
          const isRunning = currentStep === step.key;
          const isPending = !isDone && !isRunning;
          return (
            <React.Fragment key={step.key}>
              <div className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                isDone    ? 'bg-green-500/10 border-green-500/40' :
                isRunning ? 'bg-blue-500/15 border-blue-400/60 shadow-md shadow-blue-500/10' :
                            'bg-black/30 border-white/5'
              }`}>
                <span className="text-xl">{step.icon}</span>
                <div className={`text-[9px] font-black uppercase tracking-widest text-center whitespace-pre-line leading-tight ${
                  isDone ? 'text-green-400' : isRunning ? 'text-blue-300' : 'text-slate-600'
                }`}>{step.label}</div>
                {isRunning && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                )}
                {isDone && (
                  <span className="text-green-400 text-xs font-bold">✓</span>
                )}
              </div>
              {idx < PIPELINE_STEPS.length - 1 && (
                <div className={`w-6 h-0.5 flex-shrink-0 transition-colors duration-300 ${
                  doneSteps.includes(step.key) ? 'bg-green-500/60' : 'bg-slate-700'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Console Log */}
      <div className="p-3 bg-black/60 rounded-xl border border-white/10 font-mono text-[11px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">⚙ HARNESS WORKER — Agent Console</span>
          <StatusBadge status={taskStatus} />
        </div>
        <div className="space-y-0.5 max-h-28 overflow-y-auto pr-1">
          {log.map((entry, i) => (
            <div key={i} className={`${logColors[entry.type] || 'text-slate-400'}`}>
              <span className="text-slate-600 mr-2">{entry.time}</span>{entry.text}
            </div>
          ))}
          {(taskStatus === 'PENDING' || taskStatus === 'RUNNING' || taskStatus === 'RETRY') && (
            <div className="text-blue-400 flex items-center gap-1 mt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main BlogView ─────────────────────────────────────────
const BlogView = ({ theme, onShowToast }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [viewTab, setViewTab] = useState('html');
  const [copied, setCopied] = useState(false);

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
      console.error('Failed to fetch blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetail = async (postId) => {
    try {
      const res = await axios.get(`/api/blog/posts/${postId}`);
      if (res.data.success) setSelectedPost(res.data.data);
    } catch (err) {
      console.error('Failed to fetch post detail:', err);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  // ① 생성 버튼 → task_queue에 PENDING 삽입 (Harness 경유)
  const handleGenerate = async () => {
    setGenerating(true);
    setActiveTaskId(null);
    try {
      const res = await axios.post('/api/blog/generate');
      if (res.data.success) {
        setActiveTaskId(res.data.task_id);
        if (onShowToast) onShowToast(`🚀 Harness Worker가 Task #${res.data.task_id} 처리 시작!`);
      }
    } catch (err) {
      console.error('Failed to queue task:', err);
      setGenerating(false);
    }
  };

  // ② Worker 완료 콜백
  const handleTaskComplete = (post) => {
    setGenerating(false);
    setSelectedPost(post);
    fetchPosts();
    if (onShowToast) onShowToast('✅ 퀀트 포스팅 생성 완료! Harness Worker 정상 완주.');
  };

  const handleTaskError = (errLog) => {
    setGenerating(false);
    if (onShowToast) onShowToast('❌ Harness AI Self-Correction 최종 실패. 로그를 확인하세요.');
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    if (onShowToast) onShowToast('📋 클립보드에 복사 완료! (네이버/티스토리에 붙여넣으세요)');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('이 포스팅을 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/blog/posts/${postId}`);
      if (onShowToast) onShowToast('🗑️ 포스팅이 삭제되었습니다.');
      setSelectedPost(null);
      fetchPosts();
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handlePublish = async (postId) => {
    try {
      await axios.put(`/api/blog/posts/${postId}/publish`);
      if (onShowToast) onShowToast('✅ 발행 완료 상태로 변경되었습니다.');
      fetchPostDetail(postId);
      fetchPosts();
    } catch (err) {
      console.error('Failed to publish:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Control Banner ── */}
      <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} shadow-xl`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl shadow-lg shadow-blue-500/20">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme.title} flex items-center gap-2 flex-wrap`}>
                Quant Stock Auto-Blogger Engine
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  v1.0 HARNESS
                </span>
              </h2>
              <p className={`text-xs ${theme.desc} mt-1`}>
                StockPlus DB → Harness Worker (KAIROS 패턴 + AI Self-Correction) → SEO 최적화 포스팅 자동 생성
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {generating ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /><span>Harness 처리 중...</span></>
            ) : (
              <><Sparkles className="w-4 h-4" /><span>오늘 자 포스팅 즉시 생성</span></>
            )}
          </button>
        </div>

        {/* Harness Worker Progress (task_id 폴링) */}
        {activeTaskId && (
          <WorkerProgress
            taskId={activeTaskId}
            onComplete={handleTaskComplete}
            onError={handleTaskError}
          />
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Post List */}
        <div className={`lg:col-span-4 ${theme.card} p-5 rounded-3xl border ${theme.border} flex flex-col h-[680px]`}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <h3 className={`font-bold text-sm ${theme.title} flex items-center gap-2`}>
              <Calendar className="w-4 h-4 text-blue-400" />
              포스팅 히스토리 ({posts.length})
            </h3>
            <button onClick={fetchPosts} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {posts.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                생성된 포스팅이 없습니다.<br />
                상단 버튼으로 Harness를 가동하세요!
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
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-400">{post.post_date}</span>
                      <StatusBadge status={post.status} />
                    </div>
                    <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isSelected ? 'text-blue-400' : theme.title}`}>
                      {post.title}
                    </h4>
                    {post.seo_keywords && (
                      <p className="text-[10px] text-slate-600 mt-1.5 truncate">{post.seo_keywords}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className={`lg:col-span-8 ${theme.card} p-6 rounded-3xl border ${theme.border} flex flex-col h-[680px]`}>
          {selectedPost ? (
            <div className="flex flex-col h-full">
              {/* Tab & Action Bar */}
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
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
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

              {/* SEO Keywords strip */}
              {selectedPost.seo_keywords && (
                <div className="mt-3 mb-1 flex flex-wrap gap-1.5">
                  {selectedPost.seo_keywords.split(',').map((kw, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 text-cyan-400 text-[10px] font-bold rounded-full">
                      #{kw.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Content Viewer */}
              <div className="flex-1 overflow-y-auto mt-3 p-4 rounded-2xl bg-white/5 border border-white/5">
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm gap-3">
              <Eye className="w-12 h-12 text-slate-700" />
              <span>좌측 목록에서 포스팅을 선택하거나<br />새 포스팅을 생성하세요.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogView;
