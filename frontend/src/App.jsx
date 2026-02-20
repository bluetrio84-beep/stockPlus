import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WatchlistSummary from './components/WatchlistSummary';
import AiKeywordManager from './components/AiKeywordManager';
import AdminDashboard from "./components/AdminDashboard";
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import { isAuthenticated, isAdmin } from './api/authApi';

const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

// [추가] 관리자 전용 라우트
const AdminRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    if (!isAdmin()) {
        return <Navigate to="/" replace />;
    }
    return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/stock/:stockCode" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/summary" element={<ProtectedRoute><WatchlistSummary /></ProtectedRoute>} />
        <Route path="/keywords" element={<ProtectedRoute><AiKeywordManager /></ProtectedRoute>} />
        {/* 관리자 라우트 적용 */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
