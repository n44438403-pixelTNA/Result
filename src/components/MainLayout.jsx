import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { LogOut, Home, ArrowLeft, Settings, DownloadCloud, Info, X } from 'lucide-react';
import AdminManager from './admin/AdminManager';
import { db } from '../lib/db';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdminManagerOpen, setIsAdminManagerOpen] = useState(false);
  const [appConfig, setAppConfig] = useState({ appDownloadLink: '', globalNotice: '' });
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  useEffect(() => {
     db.getGlobalAppConfig().then(cfg => {
         setAppConfig(cfg);
     });
     // Load dismiss state from session storage
     const dismissed = sessionStorage.getItem('noticeDismissed');
     if (dismissed === 'true') {
         setIsNoticeDismissed(true);
     }
  }, []);

  const handleDismissNotice = () => {
     setIsNoticeDismissed(true);
     sessionStorage.setItem('noticeDismissed', 'true');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-6 relative pb-32">
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
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsAdminManagerOpen(true)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="w-full max-w-5xl px-4 flex-1">
        <Outlet />
      </div>

      {/* Global App Download & Notice Widget */}
      {!isNoticeDismissed && (appConfig.appDownloadLink || appConfig.globalNotice) && (
          <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-full md:max-w-sm bg-white border shadow-xl rounded-lg overflow-hidden z-50 print:hidden flex flex-col">
              <button
                  onClick={handleDismissNotice}
                  className="absolute top-2 right-2 p-1 bg-black/10 hover:bg-black/20 rounded-full text-white transition-colors z-10"
                  aria-label="Dismiss notice"
              >
                  <X className="h-4 w-4" />
              </button>
              {appConfig.appDownloadLink && (
                  <a href={appConfig.appDownloadLink} target="_blank" rel="noreferrer" className="block bg-blue-600 hover:bg-blue-700 text-white font-bold text-center py-3 flex items-center justify-center gap-2 transition-colors pr-8">
                      <DownloadCloud className="h-5 w-5" /> Download Our App
                  </a>
              )}
              {appConfig.globalNotice && (
                  <div className="p-3 bg-yellow-50 border-t border-yellow-100 flex flex-col max-h-40">
                      <div className="flex items-center gap-1 text-yellow-800 font-bold text-sm mb-1">
                          <Info className="h-4 w-4" /> Notice
                      </div>
                      <div className="text-sm text-yellow-900 overflow-y-auto pr-2 custom-scrollbar whitespace-pre-wrap">
                          {appConfig.globalNotice}
                      </div>
                  </div>
              )}
          </div>
      )}

      <footer className="mt-10 text-gray-500 text-sm pb-6 text-center space-y-1">
        <div>&copy; {new Date().getFullYear()} Result Management System</div>
        <div className="font-medium text-gray-400">Developed by Nadim Anwar</div>
      </footer>

      {user && (
         <AdminManager isOpen={isAdminManagerOpen} onClose={() => setIsAdminManagerOpen(false)} />
      )}
    </div>
  );
}
