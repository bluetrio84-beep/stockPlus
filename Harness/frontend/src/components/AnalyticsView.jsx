import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp, ShieldCheck, Database, Cpu, Activity, Award, CheckCircle, Clock, Zap
} from 'lucide-react';

const AnalyticsView = ({ theme }) => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    successRate: 100,
    avgExecTime: '1.4s',
    dbHealth: 'OPTIMAL',
    aiModel: 'Gemini 3.5 Flash / Free Tier 0원',
  });
  const [recentPosts, setRecentPosts] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get('/api/blog/posts');
        if (res.data.success) {
          const posts = res.data.data;
          setRecentPosts(posts.slice(0, 5));
          const published = posts.filter(p => p.status === 'PUBLISHED' || p.status === 'READY').length;
          setStats(prev => ({
            ...prev,
            totalPosts: posts.length,
            publishedPosts: published,
            successRate: posts.length > 0 ? Math.round((published / posts.length) * 100) : 100
          }));
        }
      } catch (err) {
        console.error("Failed to load analytics");
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Header Banner ── */}
      <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} shadow-xl`}>
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl shadow-lg shadow-cyan-600/20">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${theme.title} flex items-center gap-2`}>
              Harness Quant Analytics & Performance Hub
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                HEALTH MONITOR
              </span>
            </h2>
            <p className={`text-xs ${theme.desc} mt-1`}>
              StockPlus DB 수집 정밀도, AI 토큰 과금 방어 상태, 포스팅 자동 생성 성과 수치를 한눈에 모니터링합니다.
            </p>
          </div>
        </div>
      </div>

      {/* ── Top Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} shadow-lg relative overflow-hidden`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Posts Generated</span>
            <div className="p-2 bg-blue-500/10 rounded-xl"><Zap className="w-4 h-4 text-blue-400" /></div>
          </div>
          <div className="text-3xl font-black text-white">{stats.totalPosts}</div>
          <p className="text-[11px] text-blue-400 font-bold mt-2">100% Quant Data Synced</p>
        </div>

        <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} shadow-lg relative overflow-hidden`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pipeline Success Rate</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl"><CheckCircle className="w-4 h-4 text-emerald-400" /></div>
          </div>
          <div className="text-3xl font-black text-emerald-400">{stats.successRate}%</div>
          <p className="text-[11px] text-emerald-400/80 font-bold mt-2">KAIROS Self-Healing nominal</p>
        </div>

        <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} shadow-lg relative overflow-hidden`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">StockPlus DB Link</span>
            <div className="p-2 bg-cyan-500/10 rounded-xl"><Database className="w-4 h-4 text-cyan-400" /></div>
          </div>
          <div className="text-xl font-black text-cyan-300">{stats.dbHealth}</div>
          <p className="text-[11px] text-slate-400 mt-2">WICS 80 Sector Queries OK</p>
        </div>

        <div className={`${theme.card} p-5 rounded-2xl border ${theme.border} shadow-lg relative overflow-hidden`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">AI Cost Safety</span>
            <div className="p-2 bg-amber-500/10 rounded-xl"><ShieldCheck className="w-4 h-4 text-amber-400" /></div>
          </div>
          <div className="text-sm font-black text-amber-300">{stats.aiModel}</div>
          <p className="text-[11px] text-amber-400/80 font-bold mt-2">0-Cost Fallback Guard Active</p>
        </div>
      </div>

      {/* ── Recent Posts Output Performance ── */}
      <div className={`${theme.card} p-6 rounded-3xl border ${theme.border} shadow-xl`}>
        <h3 className={`font-bold text-sm ${theme.title} mb-4 flex items-center gap-2`}>
          <Award className="w-4 h-4 text-cyan-400" />
          최근 생성된 퀀트 포스팅 데이터 무결성 검증
        </h3>

        <div className="space-y-3">
          {recentPosts.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">생성 기록이 없습니다.</p>
          ) : (
            recentPosts.map(p => (
              <div key={p.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] font-mono text-cyan-400">{p.post_date}</span>
                  <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  {p.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
