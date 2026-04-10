import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCog, Clock, Palette, Save, Loader2, Sun, Moon } from 'lucide-react';

const SettingsView = ({ theme, currentTheme, changeTheme, onShowToast }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [persona, setPersona] = useState('Professional');
  const [prompt, setPrompt] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [outputPath, setOutputPath] = useState('/Projects/Harness/exports/videos');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/api/settings');
        if (res.data.agent_persona) setPersona(res.data.agent_persona);
        if (res.data.agent_prompt) setPrompt(res.data.agent_prompt);
        if (res.data.schedule_time) setScheduleTime(res.data.schedule_time);
        if (res.data.output_path) setOutputPath(res.data.output_path);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/settings', { settings: { agent_persona: persona, agent_prompt: prompt, schedule_time: scheduleTime, output_path: outputPath } });
      onShowToast('설정이 데이터베이스에 저장되었습니다.');
    } catch (err) { alert('오류'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

  // 테마별 입력창 스타일링 정밀 제어
  const getInputStyle = () => {
    if (currentTheme === 'dark') {
      return { backgroundColor: '#000000', color: '#ffffff', borderColor: '#333333' };
    } else if (currentTheme === 'harness') {
      return { backgroundColor: '#1e293b', color: '#ffffff', borderColor: '#334155' }; // 하네스 오리지널 네이비 톤
    }
    return { backgroundColor: '#ffffff', color: '#000000', borderColor: '#cccccc' };
  };

  const inputStyle = getInputStyle();
  const optionStyle = { backgroundColor: currentTheme === 'light' ? '#ffffff' : '#0f172a', color: currentTheme === 'light' ? '#000000' : '#ffffff' };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div><h2 className={`text-3xl font-bold mb-2 ${theme.title}`}>시스템 설정</h2><p className={theme.desc}>실시간 관리자 패널입니다.</p></div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? '저장' : '설정 저장하기'}</button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}>
          <div className="flex items-center gap-3 mb-6"><UserCog className="text-blue-500" /><h3 className={`text-xl font-bold ${theme.title}`}>에이전트 페르소나</h3></div>
          <div className="space-y-6">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>말투</label>
              <select value={persona} onChange={(e) => setPersona(e.target.value)} style={inputStyle} className="w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-bold cursor-pointer appearance-none">
                <option value="Professional" style={optionStyle}>💼 전문적인 분석가</option>
                <option value="Friendly" style={optionStyle}>😊 친절한 AI</option>
                <option value="Humorous" style={optionStyle}>🤣 유머러스</option>
                <option value="MZ" style={optionStyle}>🔥 MZ 트렌드</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>지침</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} style={inputStyle} className="w-full p-4 rounded-xl border h-32 focus:outline-none focus:ring-2 focus:ring-blue-500/40" placeholder="규칙 입력..." />
            </div>
          </div>
        </section>
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}>
          <div className="flex items-center gap-3 mb-6"><Clock className="text-orange-500" /><h3 className={`text-xl font-bold ${theme.title}`}>스케줄러</h3></div>
          <div className="space-y-6">
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${theme.muted}`}>자동 가동 시간</label>
            <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} style={inputStyle} className="w-full p-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-bold" />
          </div>
        </section>
        <section className={`${theme.card} border ${theme.border} rounded-3xl p-8 shadow-xl`}><div className="flex items-center gap-3 mb-6"><Palette className="text-purple-500" /><h3 className={`text-xl font-bold ${theme.title}`}>테마</h3></div><div className="grid grid-cols-3 gap-4"><button onClick={() => changeTheme('light')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${currentTheme === 'light' ? 'border-blue-500 bg-blue-500/5' : `border-slate-700/20 ${theme.desc}`}`}><Sun className="w-6 h-6 text-yellow-500" /><span className="text-xs font-bold">Light</span></button><button onClick={() => changeTheme('dark')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${currentTheme === 'dark' ? 'border-blue-500 bg-blue-500/5' : `border-slate-700/20 ${theme.desc}`}`}><Moon className="w-6 h-6 text-blue-400" /><span className="text-xs font-bold">Dark</span></button><button onClick={() => changeTheme('harness')} className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${currentTheme === 'harness' ? 'border-blue-500 bg-blue-500/5' : `border-slate-700/20 ${theme.desc}`}`}><Palette className="w-6 h-6 text-cyan-400" /><span className="text-xs font-bold">Harness</span></button></div></section>
      </div>
    </div>
  );
};

export default SettingsView;
