// ===================================================
// STAFF LAYOUT - Dashboard Container
// Role: Staff/Contributor with power >= 5
// ===================================================

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  LogOut,
  Menu,
  X,
  Lightbulb,
  Plus,
  User,
  Home,
} from 'lucide-react';

export const StaffLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ===================================================
  // Navigation Items
  // ===================================================
  const navItems = [
    {
      id: 'feed',
      label: 'Idea Feed',
      icon: <BookOpen size={20} />,
      path: '/staff',
    },
    {
      id: 'submit',
      label: 'Submit Idea',
      icon: <Plus size={20} />,
      path: '/staff/submit',
    },
    {
      id: 'myideas',
      label: 'My Submissions',
      icon: <Lightbulb size={20} />,
      path: '/staff/myideas',
    },
    {
      id: 'home',
      label: 'Back to Home',
      icon: <Home size={20} />,
      path: '/ideas',
    },
  ];

  // ===================================================
  // Check current active tab
  // ===================================================
  const isActive = (path: string): boolean => {
    if (path === '/staff') {
      return location.pathname === '/staff';
    }
    return location.pathname.startsWith(path);
  };

  // ===================================================
  // Handle logout
  // ===================================================
  const handleLogout = () => {
    localStorage.removeItem('tu_jwt_token');
    localStorage.removeItem('tu_user_info');
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
                  <Lightbulb size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Contributor</h2>
                  <p className="text-purple-400 text-xs">Staff Portal</p>
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

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {item.icon}
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all duration-200">
            <User size={20} />
            {sidebarOpen && (
              <span className="text-sm font-medium">Profile</span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 transition-all duration-200"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 flex items-center px-6 shadow-xl">
          <h2 className="text-xl font-bold text-white">
            💡 Staff Contributor Portal
          </h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-900 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
