import React from 'react';
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <div className="w-full max-w-4xl px-4">
        <Outlet />
      </div>
      <footer className="mt-10 text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} Result Management System
      </footer>
    </div>
  );
}
