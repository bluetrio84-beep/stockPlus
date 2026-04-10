import React from 'react';
import axios from 'axios';
import { Zap, FileText, Activity } from 'lucide-react';

const YouTubeView = ({ theme, onShowToast, setScriptResult }) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pb-20">
      <div className="flex justify-between items-center mb-10">
        <div><h2 className={`text-3xl font-bold mb-2 ${theme.title}`}>YouTube Studio</h2><p className={theme.desc}>AI가 시장 데이터를 분석하여 대본을 기획합니다.</p></div>
        <button onClick={async () => { onShowToast('에이전트 가동 시작...'); try { const res = await axios.post('/api/youtube/plan', {}); setScriptResult(res.data); } catch (err) { alert('오류'); } }} className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95"><Zap className="w-5 h-5 fill-current" /> 자율 AI 기획 시작</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-2xl`}>
            <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${theme.title}`}><FileText className="text-blue-500" /> 생성된 대본 (Preview)</h3>
            <div className={`bg-black/20 rounded-2xl p-8 min-h-[400px] border ${theme.border}`}><p className={`whitespace-pre-wrap leading-relaxed ${theme.desc} italic`}>[기획 시작] 버튼을 누르면 에이전트가 작동합니다.</p></div>
          </div>
        </div>
        <div className="space-y-8">
          <div className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}>
            <h4 className={`font-bold mb-6 ${theme.title}`}>에이전트 상태</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between"><span className={`text-sm ${theme.desc}`}>활성 에이전트</span><span className="px-3 py-1 bg-blue-600/10 text-blue-500 rounded-lg text-xs font-bold">Narrative-Architect</span></div>
              <div className="flex items-center justify-between"><span className={`text-sm ${theme.desc}`}>데이터 소스</span><span className={`text-sm font-bold ${theme.title}`}>StockPlus DB</span></div>
              <div className="pt-4 border-t border-slate-700/30"><div className="flex items-center gap-2 text-green-500"><Activity className="w-4 h-4 animate-pulse" /><span className="text-xs font-bold uppercase tracking-widest">Linked & Ready</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeView;
