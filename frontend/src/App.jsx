import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WatchlistSummary from './components/WatchlistSummary';
import AiKeywordManager from './components/AiKeywordManager';
import AdminDataCollection from "./components/AdminDataCollection";
import AdminSystemManagement from "./components/AdminSystemManagement";
import AdminIntelligenceDashboard from "./components/AdminIntelligenceDashboard";
import NextLeaderDashboard from "./components/NextLeaderDashboard";
import AdminChartDashboard from "./components/AdminChartDashboard";
import AdminTheDailyMagazine from "./components/AdminTheDailyMagazine";
import AdminFailureManagement from "./components/AdminFailureManagement";
import MyPortfolioDashboard from "./components/MyPortfolioDashboard";
import InvestmentJournal from "./components/InvestmentJournal";
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

// 관리자 전용 라우트
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
        <Route path="/notes" element={<ProtectedRoute><InvestmentJournal /></ProtectedRoute>} />
        
        {/* 관리자 전용 라우트 */}
        <Route path="/admin" element={<AdminRoute><AdminDataCollection /></AdminRoute>} />
        <Route path="/admin/intel" element={<AdminRoute><AdminIntelligenceDashboard /></AdminRoute>} />
        <Route path="/admin/next-leaders" element={<AdminRoute><NextLeaderDashboard /></AdminRoute>} />
        <Route path="/admin/chart" element={<AdminRoute><AdminChartDashboard /></AdminRoute>} />
        <Route path="/admin/system" element={<AdminRoute><AdminSystemManagement /></AdminRoute>} />
        <Route path="/admin/failure" element={<AdminRoute><AdminFailureManagement /></AdminRoute>} />
        <Route path="/admin/magazine" element={<AdminRoute><AdminTheDailyMagazine /></AdminRoute>} />
        <Route path="/admin/my-dashboard" element={<AdminRoute><MyPortfolioDashboard /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
