// ===================================================
// VIEWER LAYOUT - Read-Only Idea Browsing
// Role: Viewer with power >= 1
// ===================================================

import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Eye,
  LogOut,
  Home,
} from 'lucide-react';

export const ViewerLayout: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ===================================================
  // Handle logout
  // ===================================================
  const handleLogout = () => {
    localStorage.removeItem('tu_jwt_token');
    localStorage.removeItem('tu_user_info');
    localStorage.removeItem('tu_user_power');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* ===== SIDEBAR ===== */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 transition-all duration-300 flex flex-col`}
      >
        {/* Logo Area */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                  <Eye size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Viewer</h2>
                  <p className="text-gray-400 text-xs">Browse Only</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X size={18} className="text-slate-400" />
              ) : (
                <Menu size={18} className="text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          <button
            onClick={() => navigate('/viewer')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-lg"
          >
            <Home size={20} />
            {sidebarOpen && 'Browse Ideas'}
          </button>
        </nav>

        {/* Role Status */}
        <div className="p-4 border-t border-slate-700">
          <div className="bg-gray-900/30 border border-gray-700 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye size={14} className="text-gray-400" />
              {sidebarOpen && (
                <span className="text-xs text-gray-300 font-semibold">
                  Viewer Account
                </span>
              )}
            </div>
            {sidebarOpen && (
              <p className="text-xs text-slate-400">
                Read-only access to approved ideas
              </p>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="m-4 w-auto flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors"
        >
          <LogOut size={18} />
          {sidebarOpen && 'Logout'}
        </button>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
