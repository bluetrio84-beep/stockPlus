import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Zap, FileText, Activity, TrendingUp, Music, Layout, 
  Layers, CheckCircle2, RefreshCcw, Play, BarChart3, Clock
} from 'lucide-react';

const YouTubeView = ({ theme, onShowToast, setScriptResult }) => {
  const [taskQueue, setTaskQueue] = useState([]);
  const [producing, setProducing] = useState(false);
  const [shownTaskIds, setShownTaskIds] = useState(new Set());
  const [activeJobName, setActiveJobJobName] = useState(null);
  
  const engineeringTopics = [
    "엔비디아의 차세대 AI 칩 설계 혁신",
    "나스닥 기술주의 자율 주행 알고리즘 분석",
    "양자 컴퓨팅과 미래 보안 시장의 격변",
    "K-반도체 초미세 공정의 기술적 한계 돌파",
    "테슬라 휴머노이드 옵티머스의 뇌 구조 분석",
    "스페이스X 스타십의 재사용 로켓 공학"
  ];

  const [topic, setTopic] = useState(engineeringTopics[Math.floor(Math.random() * engineeringTopics.length)]);

  // 태스크 큐 폴링 (제작 진행 상태 확인용)
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await axios.get('/api/tasks/queue');
        
        // 현재 추적 중인 activeJobName이 있으면 그것으로 필터링, 없으면 전체 (초기화 효과)
        const currentTasks = activeJobName 
          ? res.data.filter(t => t.job_name === activeJobName)
          : [];

        setTaskQueue(currentTasks);
        const activeProd = currentTasks.some(t => t.status === 'RUNNING' || t.status === 'PENDING' || t.status === 'RETRY');
        setProducing(activeProd);

        // SCRIPTING 단계가 성공하면 자동으로 대본 영역 업데이트 및 팝업 트리거
        const scriptTask = currentTasks.find(t => t.step_name === 'SCRIPTING' && t.status === 'SUCCESS');
        
        if (scriptTask && scriptTask.result_path && !shownTaskIds.has(scriptTask.task_id)) {
            setScriptResult({
                topic: topic,
                persona: "Professional",
                script: scriptTask.result_path
            });
            setShownTaskIds(prev => new Set(prev).add(scriptTask.task_id));
        }
      } catch (err) { console.error("Task fetch failed"); }
    };
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [topic, setScriptResult, shownTaskIds, activeJobName]);

  const steps = [
    { id: 'PLANNING', label: '기획 분석', icon: Layout },
    { id: 'SCRIPTING', label: '대본 작성', icon: FileText },
    { id: 'VOICE', label: '음성 합성', icon: Music },
    { id: 'VIDEO', label: '영상 편집', icon: Layers },
    { id: 'RENDER', label: '최종 렌더링', icon: Zap }
  ];

  const getStepStatus = (stepId) => {
    const task = [...taskQueue].reverse().find(t => t.step_name === stepId);
    if (!task) return 'WAITING';
    return task.status;
  };

  const renderStepIcon = (status, Icon) => {
    switch(status) {
      case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'RUNNING': return <RefreshCcw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'RETRY': return <RefreshCcw className="w-5 h-5 text-amber-500 animate-spin" />;
      case 'FAILED': return <Zap className="w-5 h-5 text-red-500" />;
      default: return <Icon className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      {/* Header & Main Action */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
        <div>
          <h2 className={`text-3xl font-black mb-2 flex items-center gap-3 ${theme.title}`}>
            <Video className="text-red-600 w-8 h-8" /> YouTube Studio
          </h2>
          <p className={theme.desc}>하네스 에이전트가 시장 데이터를 분석하여 고수익 영상을 자동 생산합니다.</p>
        </div>
        <div className="flex items-center gap-4 bg-black/20 p-2 rounded-2xl border border-white/5 shadow-inner">
          <input 
            type="text" 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)}
            className={`bg-transparent border-none focus:outline-none px-4 py-2 font-bold ${theme.title} w-64`}
            placeholder="주제를 입력하세요..."
          />
          <button 
            onClick={async () => { 
              const newJobName = `YouTube Production: ${topic} #${Date.now().toString().slice(-4)}`;
              setActiveJobJobName(newJobName);
              setTaskQueue([]); // 즉시 초기화
              onShowToast('새로운 자율 주행 파이프라인 가동됨!'); 
              try { 
                await axios.post('/api/youtube/plan', { topic: topic, job_name: newJobName }); 
              } catch (err) { alert('오류'); } 
            }} 
            className="flex items-center gap-3 px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap"
          >
            <Zap className="w-4 h-4 fill-current" /> 자율 AI 기획 시작
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Left: Trend & Analysis (1/4) */}
        <div className="xl:col-span-1 space-y-8">
          <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp className="w-24 h-24" /></div>
            <h4 className={`text-xs font-black ${theme.muted} uppercase tracking-widest mb-6 flex items-center gap-2`}><BarChart3 className="w-4 h-4" /> Trend Score</h4>
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-5xl font-black ${theme.title}`}>92</span>
              <span className="text-emerald-500 font-bold mb-2 flex items-center text-sm"><TrendingUp className="w-4 h-4" /> +12%</span>
            </div>
            <p className={`text-xs ${theme.desc} mb-8`}>현재 해당 주제는 주식 커뮤니티 및 유튜브 검색량에서 급상승 중입니다.</p>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-bold"><span className={theme.muted}>관심도</span><span className="text-blue-400">HIGH</span></div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="w-[85%] h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div></div>
              <div className="flex justify-between text-[11px] font-bold pt-2"><span className={theme.muted}>경쟁 강도</span><span className="text-amber-500">LOW</span></div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="w-[30%] h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div></div>
            </div>
          </div>

          <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}>
            <h4 className={`text-xs font-black ${theme.muted} uppercase tracking-widest mb-6 flex items-center gap-2`}><Clock className="w-4 h-4" /> AI Asset Library</h4>
            <div className="space-y-4">
              <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Music className="w-4 h-4" /></div>
                <div><p className="text-[11px] font-bold text-white">Cinematic Tension</p><p className="text-[9px] text-slate-500">BGM: High Energy</p></div>
              </div>
              <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Layers className="w-4 h-4" /></div>
                <div><p className="text-[11px] font-bold text-white">Pretendo Font</p><p className="text-[9px] text-slate-500">Style: Bold Subtitle</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Production Pipeline (3/4) */}
        <div className="xl:col-span-3 space-y-8">
          {/* Timeline Bar */}
          <div className={`${theme.card} border ${theme.border} rounded-[2.5rem] p-10 shadow-2xl relative`}>
            <div className="flex justify-between items-center mb-12">
              <h3 className={`text-xl font-black ${theme.title} flex items-center gap-3`}><Activity className="text-blue-500" /> Production Pipeline</h3>
              <div className="flex items-center gap-2"><span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${producing ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>{producing ? 'Producing...' : 'Idle'}</span></div>
            </div>
            
            <div className="relative flex justify-between">
              {/* Connector Line */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 z-0"></div>
              {producing && <div className="absolute top-1/2 left-0 w-[45%] h-1 bg-blue-600 -translate-y-1/2 z-0 shadow-[0_0_15px_rgba(37,99,235,0.8)] transition-all duration-1000"></div>}

              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : status === 'RUNNING' ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.5)] scale-110' : 'bg-slate-900 border-white/10'}`}>
                      {renderStepIcon(status, step.icon)}
                    </div>
                    <span className={`mt-4 text-[10px] font-black tracking-widest uppercase ${status === 'SUCCESS' ? 'text-emerald-500' : status === 'RUNNING' ? 'text-blue-400' : 'text-slate-600'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Script Preview Area */}
          <div className={`${theme.card} border ${theme.border} rounded-[2.5rem] p-10 shadow-2xl min-h-[400px] flex flex-col`}>
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
              <h3 className={`text-lg font-black ${theme.title} flex items-center gap-3`}><FileText className="text-amber-500" /> AI 기획 리포트</h3>
              <button className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-all"><RefreshCcw className="w-4 h-4" /></button>
            </div>
            <div className={`flex-1 bg-black/20 rounded-3xl p-10 border ${theme.border} font-mono text-sm leading-relaxed ${theme.desc} italic flex flex-col items-center justify-center text-center`}>
              {!producing ? (
                <>
                  <Play className="w-16 h-16 mb-6 text-slate-700 opacity-20" />
                  <p className="max-w-md">[자율 AI 기획 시작] 버튼을 누르면 에이전트가 시장 데이터를 분석하여 쇼츠 대본과 연출 기획안을 생성합니다.</p>
                </>
              ) : (
                <div className="w-full text-left not-italic">
                  <p className="text-emerald-500 font-bold mb-4 animate-pulse">{">>>"} Analyzing Market Data for: {topic}</p>
                  <p className="text-white/80">트렌드 분석 완료. 대본 생성 단계로 진입 중...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock Video Icon for the Header
const Video = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
  </svg>
);

export default YouTubeView;
