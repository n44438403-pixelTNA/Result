import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { LogOut, Home, ArrowLeft } from 'lucide-react';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6">
      <div className="w-full max-w-5xl px-4 flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Go Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Link to="/" className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Home className="h-6 w-6" /> Result Portal
          </Link>
        </div>
        <div>
          {user ? (
            <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" /> Logout Admin
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/login')}>
              Admin Login
            </Button>
          )}
        </div>
      </div>
      <div className="w-full max-w-5xl px-4 flex-1">
        <Outlet />
      </div>
      <footer className="mt-10 text-gray-400 text-sm pb-6">
        &copy; {new Date().getFullYear()} Result Management System
      </footer>
    </div>
  );
}
