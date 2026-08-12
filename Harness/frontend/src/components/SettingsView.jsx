import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck, Cpu, Database, Palette, Save, Loader2, Sun, Moon, Zap, RefreshCw, CheckCircle2
} from 'lucide-react';

const SettingsView = ({ theme, currentTheme, changeTheme, onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modern Quant Blog Engine Settings
  const [aiModel, setAiModel] = useState('gemini-3.5-flash');
  const [maxRetries, setMaxRetries] = useState('3');
  const [fallbackGuard, setFallbackGuard] = useState('true');
  const [seoEnhance, setSeoEnhance] = useState('true');
  const [targetSectors, setTargetSectors] = useState('WICS 80 Sectors + Supply/Demand Top 5');
  const [dbHost, setDbHost] = useState('projects-mysql-1');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        if (res.data.ai_model) setAiModel(res.data.ai_model);
        if (res.data.max_retries) setMaxRetries(res.data.max_retries);
        if (res.data.fallback_guard) setFallbackGuard(res.data.fallback_guard);
        if (res.data.seo_enhance) setSeoEnhance(res.data.seo_enhance);
        if (res.data.target_sectors) setTargetSectors(res.data.target_sectors);
        if (res.data.db_host) setDbHost(res.data.db_host);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/settings', {
        settings: {
          ai_model: aiModel,
          max_retries: maxRetries,
          fallback_guard: fallbackGuard,
          seo_enhance: seoEnhance,
          target_sectors: targetSectors,
          db_host: dbHost
        }
      });
      if (onShowToast) onShowToast('✅ 퀀트 하네스 최신 설정이 DB에 보관되었습니다.');
    } catch (err) {
      alert('설정 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const getInputStyle = () => {
    if (currentTheme === 'dark') {
      return { backgroundColor: '#000000', color: '#ffffff', borderColor: '#333333' };
    } else if (currentTheme === 'harness') {
      return { backgroundColor: '#1e293b', color: '#ffffff', borderColor: '#334155' };
    }
    return { backgroundColor: '#ffffff', color: '#000000', borderColor: '#cccccc' };
  };

  const inputStyle = getInputStyle();
  const optionStyle = {
    backgroundColor: currentTheme === 'light' ? '#ffffff' : '#0f172a',
    color: currentTheme === 'light' ? '#000000' : '#ffffff'
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 space-y-8">
      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl sm:text-3xl font-bold mb-1 ${theme.title}`}>
            Harness Engine 설정 (System Control)
          </h2>
          <p className={`text-xs ${theme.desc}`}>
            Quant Blog Engine, Gemini 3.5 Flash 0원 과금 방어, KAIROS 자율 복구 파라미터를 조율합니다.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? '저장 중...' : '최신 설정 저장'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* ── AI Engine & Zero-Cost Governance ── */}
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-6 sm:p-8 shadow-xl space-y-6`}>
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <Cpu className="text-blue-400 w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${theme.title}`}>Gemini AI Engine & 0원 과금 방어</h3>
              <p className="text-[11px] text-slate-500">AI 모델 선택 및 KAIROS 자동복구 한도 설정</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className={`block font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>
                주력 LLM 모델 (Active Model)
              </label>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                style={inputStyle}
                className="w-full p-3.5 rounded-xl border font-bold cursor-pointer appearance-none"
              >
                <option value="gemini-3.5-flash" style={optionStyle}>⚡ Gemini 3.5 Flash (고성능 퀀트 추론 + 무료 0원)</option>
                <option value="gemini-flash-lite-latest" style={optionStyle}>🚀 Gemini Flash-Lite-Latest (초고속 대용량 요약)</option>
              </select>
            </div>

            <div>
              <label className={`block font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>
                KAIROS 자율 재시도 횟수 (Max Self-Healing Retries)
              </label>
              <select
                value={maxRetries}
                onChange={e => setMaxRetries(e.target.value)}
                style={inputStyle}
                className="w-full p-3.5 rounded-xl border font-bold cursor-pointer appearance-none"
              >
                <option value="3" style={optionStyle}>3회 자동 재시도 (권장)</option>
                <option value="5" style={optionStyle}>5회 자동 재시도 (고난도 파이프라인)</option>
              </select>
            </div>

            <div>
              <label className={`block font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>
                0원 과금 원천 차단 가드 (Zero-Cost Guard)
              </label>
              <select
                value={fallbackGuard}
                onChange={e => setFallbackGuard(e.target.value)}
                style={inputStyle}
                className="w-full p-3.5 rounded-xl border font-bold cursor-pointer appearance-none"
              >
                <option value="true" style={optionStyle}>🛡️ 활성화 (API 장애/초과 시 0원 스마트 로컬 엔진 Fallback)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── Quant Pipeline & StockPlus DB Target ── */}
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-6 sm:p-8 shadow-xl space-y-6`}>
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl">
              <Database className="text-cyan-400 w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${theme.title}`}>Quant Pipeline & StockPlus DB</h3>
              <p className="text-[11px] text-slate-500">실시간 데이터 수집 타겟 및 포스팅 생성 파라미터</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className={`block font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>
                수집 타겟 데이터 (Data Scope)
              </label>
              <input
                type="text"
                value={targetSectors}
                onChange={e => setTargetSectors(e.target.value)}
                style={inputStyle}
                className="w-full p-3.5 rounded-xl border font-bold"
                placeholder="WICS 80 Sectors..."
              />
            </div>

            <div>
              <label className={`block font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>
                StockPlus MySQL Host
              </label>
              <input
                type="text"
                value={dbHost}
                onChange={e => setDbHost(e.target.value)}
                style={inputStyle}
                className="w-full p-3.5 rounded-xl border font-mono font-bold"
                placeholder="projects-mysql-1"
              />
            </div>

            <div>
              <label className={`block font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>
                SEO 자동 키워드 보강 (AI SEO Enhancement)
              </label>
              <select
                value={seoEnhance}
                onChange={e => setSeoEnhance(e.target.value)}
                style={inputStyle}
                className="w-full p-3.5 rounded-xl border font-bold cursor-pointer appearance-none"
              >
                <option value="true" style={optionStyle}>✨ 활성화 (Gemini AI 기반 네이버/티스토리 최적 키워드 10개 추출)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── System UI Theme ── */}
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 xl:col-span-2`}>
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="p-2.5 bg-purple-500/10 rounded-xl">
              <Palette className="text-purple-400 w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${theme.title}`}>플랫폼 시스템 테마 (Platform Theme)</h3>
              <p className="text-[11px] text-slate-500">대시보드 전체 시각 스타일 선택</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => changeTheme('dark')}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                currentTheme === 'dark' ? 'border-blue-500 bg-blue-500/10 shadow-lg' : `border-white/10 ${theme.desc} hover:bg-white/5`
              }`}
            >
              <Moon className="w-6 h-6 text-blue-400" />
              <span className="text-xs font-bold text-white">Pure Black Dark</span>
            </button>

            <button
              onClick={() => changeTheme('harness')}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                currentTheme === 'harness' ? 'border-cyan-500 bg-cyan-500/10 shadow-lg' : `border-white/10 ${theme.desc} hover:bg-white/5`
              }`}
            >
              <Palette className="w-6 h-6 text-cyan-400" />
              <span className="text-xs font-bold text-white">Harness Deep Navy</span>
            </button>

            <button
              onClick={() => changeTheme('light')}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
                currentTheme === 'light' ? 'border-blue-500 bg-blue-500/10 shadow-lg' : `border-white/10 ${theme.desc} hover:bg-white/5`
              }`}
            >
              <Sun className="w-6 h-6 text-yellow-500" />
              <span className="text-xs font-bold">Clean Light</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
