import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import WatchlistSummary from './components/WatchlistSummary';
import Layout from './components/Layout';
import Login from './components/Login';
import Signup from './components/Signup';
import { isAuthenticated } from './api/authApi';

// 로그인 여부에 따라 접근 제한
const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="stock/:stockCode" element={<Dashboard />} />
        <Route path="summary" element={<WatchlistSummary />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
