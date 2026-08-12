import React, { useState } from 'react';
import {
  ShieldCheck, Cpu, Zap, RefreshCw, Layers, Database, Sparkles, CheckCircle2,
  ChevronRight, HelpCircle, ArrowRight, Activity, Code, Terminal, Lock
} from 'lucide-react';

const ALGORITHM_STEPS = [
  {
    phase: '01 - 20%',
    title: '1. 자율 제어 및 태스크 큐 등록 (Deterministic Trigger)',
    badge: 'STAGE 1',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    icon: Zap,
    summary: 'API 요청이 들어오면 작업을 즉시 실행하지 않고 MySQL task_queue 테이블에 PENDING 상태로 안전하게 큐잉합니다.',
    details: [
      'FastAPI 백엔드가 요청을 받아 task_queue에 저장',
      'HarnessManager 자율 워커가 2초 주기로 큐를 폴링',
      'LIMIT 1 FOR UPDATE 트랜잭션으로 동시성 충돌 및 이중 실행 완전 방지'
    ]
  },
  {
    phase: '21 - 40%',
    title: '2. 샌드박스 자원 격리 (Total Safety Sandbox)',
    badge: 'STAGE 2',
    color: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    icon: Lock,
    summary: 'BaseHarness를 상속받은 전용 에이전트가 독립된 샌드박스(sandbox_id) 공간에서 격리되어 실행됩니다.',
    details: [
      '에이전트별 전용 샌드박스 디렉토리 및 실행 환경 할당',
      '작업 중 치명적 예외 발생 시에도 메인 시스템으로 영향 전이 차단',
      '안전성이 검증된 도구(FilesystemTool, APITool)만 샌드박스 내부 허용'
    ]
  },
  {
    phase: '41 - 60%',
    title: '3. StockPlus 퀀트 수집 & Gemini 3.5 Flash AI 연동',
    badge: 'STAGE 3',
    color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
    icon: Database,
    summary: 'StockPlus DB의 80개 WICS 업종, 실시간 수급, 테마 데이터를 읽어와 AI 최적화 포스팅을 생성합니다.',
    details: [
      'StockPlus DB 읽기 전용 접근 (market_themes, industry_quotes 수집)',
      'Gemini 3.5 Flash 모델 연동 (고성능 퀀트 지표 추론)',
      '0원 과금 방어 모듈 적용 (API 쿼터 초과 시 0원 스마트 로컬 엔진 폴백)'
    ]
  },
  {
    phase: '61 - 80%',
    title: '4. KAIROS 자율 복구 & 토큰 방어 (Self-Healing)',
    badge: 'STAGE 4',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    icon: RefreshCw,
    summary: '작업 중 오류가 감지되면 AI Self-Correction 엔진이 에러를 분석하고 최대 3회 자동으로 재시도합니다.',
    details: [
      'BaseHarness.execute()가 오류 감지 시 recover_task() 호출',
      'Gemini AI가 error_log 원인을 다이렉트로 분석하여 복구 가이드 생성',
      'Context Compaction 적용으로 AI 토큰 오버플로우 방지'
    ]
  },
  {
    phase: '81 - 100%',
    title: '5. 자율 연쇄 체이닝 & Agent Console 생중계 (Chaining)',
    badge: 'STAGE 5',
    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    icon: CheckCircle2,
    summary: '스텝 완료 후 다음 스텝을 자동으로 큐에 넣고(GENERATE → SEO → PUBLISH), 화면에 실시간 생중계합니다.',
    details: [
      'queue_next_step()을 통해 다음 파이프라인 스텝 자동 삽입',
      'SSE(Server-Sent Events) 스트림으로 Agent Console에 사고 과정 실시간 송출',
      '프론트엔드 UI 상태바(📡→🤖→✅) 실시간 동기화'
    ]
  }
];

const HarnessArchitectureGuide = ({ theme }) => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Banner ── */}
      <div className={`${theme.card} p-5 sm:p-6 rounded-3xl border ${theme.border} shadow-xl`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-600/20 flex-shrink-0">
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-lg sm:text-xl font-bold ${theme.title} flex items-center gap-2 flex-wrap`}>
                Harness Engineering (HE) 자율 구동 메커니즘
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  1부터 100까지 가이드
                </span>
              </h2>
              <p className={`text-xs ${theme.desc} mt-1 leading-relaxed`}>
                초보자도 한눈에 이해할 수 있는 하네스 에이전트의 5단계 자율 실행 및 Self-Healing 프로세스입니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stepper Navigation (Mobile Scrollable) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {ALGORITHM_STEPS.map((st, idx) => {
          const isActive = activeStep === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`flex-1 min-w-[140px] p-3 rounded-2xl border text-left transition-all ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/20 scale-[1.02]'
                  : `${theme.card} ${theme.border} text-slate-400 hover:text-white`
              }`}
            >
              <div className="text-[10px] font-black tracking-widest opacity-80 mb-1">{st.phase}</div>
              <div className="text-xs font-bold truncate">{st.badge}</div>
            </button>
          );
        })}
      </div>

      {/* ── Selected Step Detail Card ── */}
      {(() => {
        const step = ALGORITHM_STEPS[activeStep];
        const StepIcon = step.icon;
        return (
          <div className={`${theme.card} p-6 sm:p-8 rounded-3xl border ${theme.border} shadow-2xl relative overflow-hidden space-y-6`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${step.color}`}>
                  <StepIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase">{step.phase} PROCESS</span>
                  <h3 className={`text-base sm:text-lg font-black ${theme.title}`}>{step.title}</h3>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${step.color}`}>
                {step.badge}
              </span>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/5">
              💡 <strong className="text-white">한줄 요약:</strong> {step.summary}
            </p>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Code className="w-4 h-4 text-blue-400" /> 세부 내부 동작 (Under the Hood)
              </h4>
              <div className="space-y-2">
                {step.details.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-mono font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                      {i + 1}
                    </span>
                    <span className="leading-snug pt-0.5">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stepper prev/next */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(prev => prev - 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-bold rounded-xl transition-all"
              >
                이전 단계
              </button>

              <span className="text-xs font-mono text-slate-500">
                {activeStep + 1} / {ALGORITHM_STEPS.length}
              </span>

              <button
                disabled={activeStep === ALGORITHM_STEPS.length - 1}
                onClick={() => setActiveStep(prev => prev + 1)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-xs font-bold rounded-xl transition-all"
              >
                다음 단계
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default HarnessArchitectureGuide;
