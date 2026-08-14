import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FileText, Sparkles, Copy, Check, Calendar, RefreshCw, Trash2, Eye,
  Cpu, AlertCircle, CheckCircle, Clock, Download, HelpCircle, ExternalLink, Share2, Zap
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
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Direct Auto-Publishing State
  const [showAutoPublishModal, setShowAutoPublishModal] = useState(false);
  const [publishPlatform, setPublishPlatform] = useState('naver');
  const [naverId, setNaverId] = useState(localStorage.getItem('naver_id') || '');
  const [naverMode, setNaverMode] = useState('bridge');
  const [naverPw, setNaverPw] = useState(localStorage.getItem('naver_pw') || '');
  const [nidAut, setNidAut] = useState(localStorage.getItem('nid_aut') || '');
  const [nidSes, setNidSes] = useState(localStorage.getItem('nid_ses') || '');
  const [tistoryBlogName, setTistoryBlogName] = useState(localStorage.getItem('tistory_blog_name') || '');
  const [tistoryToken, setTistoryToken] = useState(localStorage.getItem('tistory_token') || '');
  const [wpUrl, setWpUrl] = useState(localStorage.getItem('wp_url') || '');
  const [wpUsername, setWpUsername] = useState(localStorage.getItem('wp_username') || '');
  const [wpAppPassword, setWpAppPassword] = useState(localStorage.getItem('wp_app_password') || '');
  const [publishingDirect, setPublishingDirect] = useState(false);

  const handleDirectAutoPublish = async () => {
    if (!selectedPost) return;
    setPublishingDirect(true);
    try {
      localStorage.setItem('naver_id', naverId);
      localStorage.setItem('naver_pw', naverPw);
      localStorage.setItem('nid_aut', nidAut);
      localStorage.setItem('nid_ses', nidSes);
      localStorage.setItem('tistory_blog_name', tistoryBlogName);
      localStorage.setItem('tistory_token', tistoryToken);
      localStorage.setItem('wp_url', wpUrl);
      localStorage.setItem('wp_username', wpUsername);
      localStorage.setItem('wp_app_password', wpAppPassword);

      if (publishPlatform === 'naver' && naverMode === 'bridge') {
        if (!naverId) {
          alert('네이버 아이디를 입력해주세요.');
          setPublishingDirect(false);
          return;
        }
        try {
          const combinedHtml = `<h1 style="font-weight:bold; font-size:1.6rem; color:#0f172a; margin-bottom:16px;">${selectedPost.title}</h1>` + selectedPost.html_content;
          const blobHtml = new Blob([combinedHtml], { type: 'text/html' });
          const blobText = new Blob([selectedPost.title + '\n\n' + (selectedPost.markdown_content || selectedPost.html_content)], { type: 'text/plain' });
          const item = new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText });
          await navigator.clipboard.write([item]);
        } catch (e) {
          await navigator.clipboard.writeText(selectedPost.title + '\n\n' + selectedPost.html_content);
        }

        if (onShowToast) {
          onShowToast('🎉 [1-Click 원스톱 복사 완료!] 네이버 글쓰기 창에서 Ctrl+V 누르시면 제목+서식이 한 번에 붙습니다!');
        }
        setShowAutoPublishModal(false);
        window.open(`https://blog.naver.com/${naverId}?Redirect=Write`, '_blank');
        return;
      }

      // Macro mode or Tistory / WordPress: Backend Playwright call!
      const res = await axios.post(`/api/blog/posts/${selectedPost.id}/auto-publish`, {
        platform: publishPlatform,
        naver_id: naverId,
        naver_pw: naverPw,
        naver_mode: naverMode,
        nid_aut: nidAut,
        nid_ses: nidSes,
        tistory_blog_name: tistoryBlogName,
        tistory_access_token: tistoryToken,
        wp_url: wpUrl,
        wp_username: wpUsername,
        wp_app_password: wpAppPassword
      });

      if (res.data.success) {
        if (onShowToast) onShowToast(`🎉 ${res.data.message || '매크로 자동 게시 완료!'}`);
        setShowAutoPublishModal(false);
        fetchPostDetail(selectedPost.id);
        fetchPosts();
        if (res.data.post_url) {
          window.open(res.data.post_url, '_blank');
        }
      } else {
        alert(`게시 실패: ${res.data.error}`);
      }
    } catch (err) {
      alert(`자동 게시 에러: ${err.response?.data?.detail || err.message}`);
    } finally {
      setPublishingDirect(false);
    }
  };

  const handleDownload = (content, ext) => {
    if (!selectedPost) return;
    const filename = `quant_blog_${selectedPost.post_date || 'post'}.${ext}`;
    const blob = new Blob([content], { type: ext === 'html' ? 'text/html;charset=utf-8;' : 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast(`💾 파일 다운로드 완료: ${filename}`);
  };

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

  const openNaverSmartCopyWindow = (post) => {
    if (!post) return;
    const win = window.open('', '_blank', 'width=850,height=800,scrollbars=yes,resizable=yes');
    if (!win) {
      alert('팝업 차단을 해제해 주세요!');
      return;
    }
    const combinedHtml = `<h1 style="font-weight:bold; font-size:22px; color:#0f172a; margin-bottom:16px;">${post.title}</h1>` + post.html_content;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${post.title}</title>
        <style>
          body { margin: 0; padding: 24px; font-family: 'Apple SD Gothic Neo', '맑은 고딕', sans-serif; background: #ffffff; color: #1e293b; }
          .banner-tip { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: bold; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="banner-tip">
          ✨ <strong>네이버 블로그 100% 동일 복사 뷰어:</strong><br/>
          아래 리포트 본문이 클립보드에 100% 복사되었습니다! 네이버 글쓰기 화면에서 바로 <strong>Ctrl + V (붙여넣기)</strong> 하세요!
        </div>
        <div id="copy-area">
          ${combinedHtml}
        </div>
        <script>
          setTimeout(() => {
            try {
              const el = document.getElementById('copy-area');
              const range = document.createRange();
              range.selectNodeContents(el);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
              document.execCommand('copy');
            } catch(e) {}
          }, 300);
        </script>
      </body>
      </html>
    `);
    win.document.close();
    if (onShowToast) onShowToast('🌟 [네이버 100% 동일 뷰어 창 개설!] 자동 복사 완료 ➔ 네이버 글쓰기에 Ctrl+V 하세요!');
  };

  const handleCopyRichHtml = async (contentHtml) => {
    try {
      const blobHtml = new Blob([contentHtml], { type: 'text/html' });
      const blobText = new Blob([contentHtml], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      setCopied(true);
      if (onShowToast) {
        onShowToast('📋 [네이버 서식 복사 완료!] 네이버 글쓰기 화면에서 바로 Ctrl+V 하시면 표와 스타일이 짠! 하고 나타납니다!');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      await navigator.clipboard.writeText(contentHtml);
    }
  };

  const handleCopyRawText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (onShowToast) {
        onShowToast('📋 [HTML 소스 코드 복사 완료!] 원본 소스 코드 복사됨.');
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const [screenshotLoading, setScreenshotLoading] = useState(false);

  const handleImageScreenshot = async (action = 'download') => {
    if (!selectedPost) return;
    setScreenshotLoading(true);
    try {
      const res = await axios.get(`/api/blog/posts/${selectedPost.id}/screenshot`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'image/png' });

      if (action === 'copy') {
        // 클립보드에 이미지 복사 (Ctrl+V로 네이버에 바로 붙여넣기)
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          if (onShowToast) onShowToast('🖼️ [이미지 클립보드 복사 완료!] 네이버 글쓰기에서 바로 Ctrl+V 하세요! 남색 박스 100% 완벽 출력!');
        } catch (e) {
          // 클립보드 이미지 복사 불가 시 다운로드로 대체
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quant_report_${selectedPost.post_date}.png`;
          a.click();
          URL.revokeObjectURL(url);
          if (onShowToast) onShowToast('⬇️ [이미지 저장 완료!] 저장된 PNG를 네이버 글쓰기에 드래그하거나 이미지 삽입으로 업로드하세요!');
        }
      } else {
        // PNG 파일 다운로드
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quant_report_${selectedPost.post_date}.png`;
        a.click();
        URL.revokeObjectURL(url);
        if (onShowToast) onShowToast('⬇️ [PNG 이미지 저장 완료!] 저장된 파일을 네이버 글쓰기에 업로드하세요!');
      }
    } catch (err) {
      if (onShowToast) onShowToast('❌ 이미지 생성 실패: ' + (err.response?.data?.detail || err.message));
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleInfographicScreenshot = async (action = 'copy') => {
    setScreenshotLoading(true);
    try {
      const res = await axios.get('/api/blog/infographic/foreigner-top10', {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'image/png' });

      if (action === 'copy') {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          if (onShowToast) onShowToast('🖼️ [외국인 TOP 10 인포그래픽 이미지 복사 완료!] 네이버 글쓰기에 Ctrl+V 하세요!');
        } catch (e) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `foreigner_top10_infographic.png`;
          a.click();
          URL.revokeObjectURL(url);
          if (onShowToast) onShowToast('⬇️ [인포그래픽 이미지 저장 완료!] 네이버 글쓰기에 업로드하세요!');
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `foreigner_top10_infographic.png`;
        a.click();
        URL.revokeObjectURL(url);
        if (onShowToast) onShowToast('⬇️ [인포그래픽 PNG 저장 완료!] 저장된 파일을 네이버 글쓰기에 업로드하세요!');
      }
    } catch (err) {
      if (onShowToast) onShowToast('❌ 인포그래픽 생성 실패: ' + (err.response?.data?.detail || err.message));
    } finally {
      setScreenshotLoading(false);
    }
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAutoPublishModal(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>내 블로그로 직접 자동 게시</span>
                  </button>

                  <button
                    onClick={() => setShowGuideModal(true)}
                    className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>게시 가이드</span>
                  </button>

                  <button
                    onClick={() => openNaverSmartCopyWindow(selectedPost)}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>🌟 원본 뷰어</span>
                  </button>

                  {/* 이미지 복사 (Ctrl+V 네이버/티스토리 붙여넣기용) */}
                  <button
                    onClick={() => handleImageScreenshot('copy')}
                    disabled={screenshotLoading}
                    className="px-3.5 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-pink-600/20"
                  >
                    {screenshotLoading ? (
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>🖼️ 전체 이미지 복사</span>
                  </button>

                  {/* 외국인 TOP 10 인포그래픽 PNG 복사 (핵심 버튼) */}
                  <button
                    onClick={() => handleInfographicScreenshot('copy')}
                    disabled={screenshotLoading}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>📊 외국인 TOP 10 인포그래픽</span>
                  </button>

                  {/* PNG 다운로드 */}
                  <button
                    onClick={() => handleImageScreenshot('download')}
                    disabled={screenshotLoading}
                    className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border border-white/10"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PNG 저장</span>
                  </button>

                  {viewTab === 'markdown' && (
                    <button
                      onClick={() => handleCopyRawText(selectedPost.markdown_content)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>마크다운 복사</span>
                    </button>
                  )}

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
                    id="quant-blog-preview-container"
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

      {/* ── Naver & Tistory Publishing Helper Modal ── */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] text-white border border-slate-700/60 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                네이버 블로그 / 티스토리 게시 가이드
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Naver Blog Guide */}
              <div className="p-4 bg-emerald-950/30 rounded-2xl border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> 1. 네이버 블로그 (Naver Blog) 게시 방법
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">추천</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                  <li>상단 <strong className="text-white">HTML 복사</strong> 버튼을 눌러 인라인 스타일 코드를 복사합니다.</li>
                  <li>네이버 블로그 글쓰기 에디터(스마트에디터 ONE) 우측 하단 <strong className="text-emerald-300">HTML</strong> 탭을 클릭합니다.</li>
                  <li>복사한 HTML을 붙여넣은 뒤 다시 <strong className="text-white">기본 에디터</strong> 모드로 전환합니다.</li>
                  <li>표, AI 퀀트 가이드 디자인, 주도주 등락률 스타일이 100% 깔끔하게 표현됩니다!</li>
                </ol>
              </div>

              {/* Tistory Guide */}
              <div className="p-4 bg-blue-950/30 rounded-2xl border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-blue-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> 2. 티스토리 (Tistory) 게시 방법
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">HTML 지원</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                  <li>티스토리 글쓰기 화면 우측 상단 <strong className="text-blue-300">기본모드 ➔ HTML 모드</strong>로 전환합니다.</li>
                  <li><strong className="text-white">HTML 복사</strong> 버튼으로 복사한 내용을 붙여넣고 [발행]을 누릅니다.</li>
                  <li>(또는 마크다운 모드 사용 시 <strong className="text-white">마크다운 복사</strong>를 사용하세요)</li>
                </ol>
              </div>

              {/* Future Open API Publisher Note */}
              <div className="p-4 bg-purple-950/30 rounded-2xl border border-purple-500/20 space-y-2">
                <h4 className="font-bold text-sm text-purple-300 flex items-center gap-2">
                  🚀 1클릭 자동 원스톱 게시 파이프라인 (Tistory Open API)
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  티스토리는 공식 Open API (OAuth Access Token)를 지원하므로, 설정 메뉴에서 토큰 등록 시 <strong>버튼 한 번 클릭으로 내 티스토리 블로그에 포스팅이 즉시 자동 발행</strong>되도록 연동이 가능합니다!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Direct Auto-Publishing Modal ── */}
      {showAutoPublishModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] text-white border border-slate-700/60 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-400 fill-current" />
                내 블로그로 1클릭 직접 자동 게시 (Direct Auto-Publish)
              </h3>
              <button
                onClick={() => setShowAutoPublishModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-2">
                  게시 블로그 플랫폼 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPublishPlatform('naver')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      publishPlatform === 'naver'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    🟢 네이버 블로그 (원스톱)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishPlatform('tistory')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      publishPlatform === 'tistory'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    🟠 티스토리 (Open API)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishPlatform('wordpress')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      publishPlatform === 'wordpress'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-md'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    🔵 워드프레스 (REST API)
                  </button>
                </div>
              </div>

              {publishPlatform === 'naver' && (
                <div className="space-y-4 bg-[#051c14] p-5 rounded-2xl border border-emerald-500/30">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                    <span className="text-xs font-bold text-emerald-300">발행 작동 모드 선택:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNaverMode('macro')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          naverMode === 'macro' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-black/40 text-emerald-400'
                        }`}
                      >
                        🤖 100% 매크로 봇 발행
                      </button>
                      <button
                        type="button"
                        onClick={() => setNaverMode('bridge')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          naverMode === 'bridge' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-black/40 text-emerald-400'
                        }`}
                      >
                        🟢 1-Click 스마트 복사
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-emerald-400 font-bold mb-1">네이버 아이디 (Naver ID)</label>
                    <input
                      type="text"
                      value={naverId}
                      onChange={e => setNaverId(e.target.value)}
                      placeholder="예: bluetrio"
                      className="w-full bg-black/60 border border-emerald-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                    />
                  </div>

                  {naverMode === 'macro' ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-emerald-300 font-bold mb-1">네이버 비밀번호 (매크로 전용)</label>
                        <input
                          type="password"
                          value={naverPw}
                          onChange={e => setNaverPw(e.target.value)}
                          placeholder="Playwright 매크로 봇 자동 로그인 비밀번호..."
                          className="w-full bg-black/60 border border-emerald-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-emerald-300/80 leading-relaxed bg-black/40 p-3 rounded-xl border border-emerald-500/20">
                        🤖 <strong>Playwright 100% 자동 매크로:</strong> 하네스 백엔드 헤드리스 브라우저가 직접 네이버 글쓰기에 들어가 제목/내용 입력부터 [발행] 버튼 클릭까지 전부 자동으로 완주합니다!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2 border-t border-emerald-500/20">
                      <p className="text-[11px] font-bold text-emerald-300">
                        ⚡ 1-Click 네이버 원스톱 렌더링 복사:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedPost.title);
                            if (onShowToast) onShowToast('📋 제목이 클립보드에 복사되었습니다!');
                          }}
                          className="py-2.5 px-3 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" /> 1. 포스팅 제목 복사
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const blobHtml = new Blob([selectedPost.html_content], { type: 'text/html' });
                              const blobText = new Blob([selectedPost.html_content], { type: 'text/plain' });
                              const item = new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText });
                              await navigator.clipboard.write([item]);
                            } catch (e) {
                              await navigator.clipboard.writeText(selectedPost.html_content);
                            }
                            if (onShowToast) onShowToast('📋 [서식 복사 완료!] 네이버 글쓰기 화면에서 바로 Ctrl+V 누르시면 끝!');
                          }}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                        >
                          <Copy className="w-3.5 h-3.5" /> 2. 렌더링 서식 복사
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {publishPlatform === 'tistory' && (
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">티스토리 블로그 이름 (blogName)</label>
                    <input
                      type="text"
                      value={tistoryBlogName}
                      onChange={e => setTistoryBlogName(e.target.value)}
                      placeholder="예: myquantblog (주소 https://myquantblog.tistory.com의 앞부분)"
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Access Token (티스토리 Open API)</label>
                    <input
                      type="password"
                      value={tistoryToken}
                      onChange={e => setTistoryToken(e.target.value)}
                      placeholder="티스토리 Open API 발급 토큰 입력..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {publishPlatform === 'wordpress' && (
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">워드프레스 사이트 주소 (WP URL)</label>
                    <input
                      type="text"
                      value={wpUrl}
                      onChange={e => setWpUrl(e.target.value)}
                      placeholder="예: https://myquantblog.com"
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">관리자 Username</label>
                    <input
                      type="text"
                      value={wpUsername}
                      onChange={e => setWpUsername(e.target.value)}
                      placeholder="WP 계정 아이디..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">Application Password</label>
                    <input
                      type="password"
                      value={wpAppPassword}
                      onChange={e => setWpAppPassword(e.target.value)}
                      placeholder="WP 프로필에서 발급한 앱 비밀번호..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAutoPublishModal(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDirectAutoPublish}
                disabled={publishingDirect}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {publishingDirect ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{publishingDirect ? '자동 게시 전송 중...' : '내 블로그로 즉시 게시'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogView;
