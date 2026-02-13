import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WatchlistSummary from './components/WatchlistSummary';
import AiKeywordManager from './components/AiKeywordManager';
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import { isAuthenticated } from './api/authApi';

/**
 * 보안 라우트(Protected Route) 컴포넌트입니다.
 * 사용자가 로그인 상태인지 확인하고, 인증되지 않았으면 로그인 페이지로 강제 리다이렉트합니다.
 */
const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        // 인증되지 않은 경우 /login 경로로 이동하며, 히스토리를 덮어씌웁니다(replace).
        return <Navigate to="/login" replace />;
    }
    return children;
};

/**
 * 애플리케이션의 최상위 컴포넌트로, 전체 라우팅 구조를 정의합니다.
 */
function App() {
  return (
    <Routes>
      {/* 1. 공개 라우트 (로그인 없이 접근 가능) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 2. 보호된 라우트 (로그인 필수) */}
      {/* Layout 컴포넌트로 감싸 공통 상단/사이드 바를 공유합니다. */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* 인덱스 경로: 기본 대시보드 */}
        <Route index element={<Dashboard />} />
        
        {/* 특정 종목 상세 조회 경로 */}
        <Route path="stock/:stockCode" element={<Dashboard />} />
        
        {/* 관심종목 요약(AI 리포트) 페이지 */}
        <Route path="summary" element={<WatchlistSummary />} />

        {/* AI 분석 키워드 관리 페이지 */}
        <Route path="keywords" element={<AiKeywordManager />} />
      </Route>

      {/* 3. 일치하는 경로가 없을 경우 홈으로 리다이렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
