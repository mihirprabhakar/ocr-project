import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Templates from './pages/Templates';
import Upload from './pages/ocr/Upload';
import Process from './pages/ocr/Process';
import History from './pages/ocr/History';
import Reports from './pages/ocr/Reports';

const PrivateRoute = ({ children, adminOnly }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !user.isAdmin) return <Navigate to="/dashboard" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  return user ? <Navigate to="/dashboard" /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="roles" element={<PrivateRoute adminOnly><Roles /></PrivateRoute>} />
            <Route path="users" element={<PrivateRoute adminOnly><Users /></PrivateRoute>} />
            <Route path="templates" element={<Templates />} />
            {/* Phase 2 — OCR */}
            <Route path="ocr/upload" element={<Upload />} />
            <Route path="ocr/process/:id" element={<Process />} />
            <Route path="ocr/history" element={<History />} />
            <Route path="ocr/reports" element={<Reports />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
