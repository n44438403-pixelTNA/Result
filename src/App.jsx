import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/admin/LoginPage';
import AdminLayout from './components/AdminLayout';
import RequireAuth from './components/RequireAuth';
import Dashboard from './pages/admin/Dashboard';
import ExamEditor from './pages/admin/ExamEditor';
import Settings from './pages/admin/Settings';
import ThemeDesigner from './pages/admin/ThemeDesigner';
import PublicLayout from './components/PublicLayout';
import SearchPage from './pages/public/SearchPage';
import ResultPage from './pages/public/ResultPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
             <Route path="/" element={<SearchPage />} />
             <Route path="/result/:session/:classId/:examId/:rollNo" element={<ResultPage />} />
          </Route>
          
          <Route path="/admin/login" element={<LoginPage />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="design" element={<ThemeDesigner />} />
            <Route path="exam/:session/:classId/:examId" element={<ExamEditor />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
