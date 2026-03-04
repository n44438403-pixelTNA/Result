import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import BrowsePage from './pages/BrowsePage';
import ExamResults from './pages/ExamResults';
import ClassResult from './pages/ClassResult';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
             <Route path="/" element={<HomePage />} />
             <Route path="/login" element={<LoginPage />} />
             <Route path="/browse" element={<BrowsePage />} />
             <Route path="/class-result/:session/:classId" element={<ClassResult />} />
             <Route path="/exam/:session/:classId/:examId" element={<ExamResults />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
