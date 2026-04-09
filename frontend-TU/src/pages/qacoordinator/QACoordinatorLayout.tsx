// ===================================================
// QA COORDINATOR LAYOUT - Track & Tag Ideas (NO Approve)
// Role: QACoordinator with power >= 10
// ===================================================

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Eye,
  Tag,
  LogOut,
  LayoutDashboard,
  CheckCircle,
} from 'lucide-react';

export const QACoordinatorLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ===================================================
  // Navigation Items (LIMITED compared to QAManager)
  // ===================================================
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
      path: '/qacoordinator',
    },
    {
      id: 'track',
      label: 'Track Ideas',
      icon: <Eye size={20} />,
      path: '/qacoordinator/track',
    },
    {
      id: 'tags',
      label: 'Manage Tags',
      icon: <Tag size={20} />,
      path: '/qacoordinator/tags',
    },
  ];

  // ===================================================
  // Check current active tab
  // ===================================================
  const isActive = (path: string): boolean => {
    if (path === '/qacoordinator') {
      return location.pathname === '/qacoordinator';
    }
    return location.pathname.startsWith(path);
  };

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
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Eye size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">QA Coordinator</h2>
                  <p className="text-purple-400 text-xs">Tracking Portal</p>
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
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              {item.icon}
              {sidebarOpen && item.label}
            </button>
          ))}
        </nav>

        {/* Role Status */}
        <div className="p-4 border-t border-slate-700">
          <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={14} className="text-purple-400" />
              {sidebarOpen && (
                <span className="text-xs text-purple-300 font-semibold">
                  QA Coordinator
                </span>
              )}
            </div>
            {sidebarOpen && (
              <p className="text-xs text-slate-400">
                Track, tag, but not approve
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
