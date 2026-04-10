// ===================================================
// AdminDashboardLayout.tsx - Admin Control Panel
// Admin access (power 18) - Full idea & user management
// ===================================================

import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTuIdentity } from '../../context/TuIdentityContext';
import clsx from 'clsx';

interface AdminTab {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const ADMIN_TABS: AdminTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin' },
  { id: 'users', label: 'User Management', icon: '👥', path: '/admin/users' },
  { id: 'ideas', label: 'Idea Management', icon: '💡', path: '/admin/ideas' },
  { id: 'access', label: 'Access Control', icon: '🔐', path: '/admin/access' },
  { id: 'logs', label: 'System Logs', icon: '📝', path: '/admin/logs' },
  { id: 'academic-years', label: 'Academic Years', icon: '📅', path: '/admin/academic-years' },
];

export const AdminDashboardLayout: React.FC = () => {
  const { isAuthenticated, user } = useTuIdentity();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    console.log(
      '%c[TU-ADMIN] 🛠️ Entering Admin Control Panel',
      'color: #0ea5e9; font-weight: bold; font-size: 14px;'
    );
  }, []);

  // 🔒 Role check - Check Power Level (Admin needs power 18+)
  if (!isAuthenticated || (user?.power || 0) < 18) {
    console.warn(
      `%c[TU-ADMIN] ⛔ Access Denied! User power: ${user?.power} (required: 18)`,
      'color: #ff0000; font-weight: bold;'
    );
    return <Navigate to="/ideas" replace />;
  }

  // Determine current active tab based on current location
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === '/admin') return 'dashboard';
    if (path === '/admin/users') return 'users';
    if (path.startsWith('/admin/users')) return 'users'; // Include user detail
    if (path === '/admin/ideas') return 'ideas';
    if (path === '/admin/access') return 'access';
    if (path === '/admin/logs') return 'logs';
    return 'dashboard';
  };

  const activeTab = getCurrentTab();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden px-2 py-1 bg-slate-700 rounded text-white">☰</button>
            <div className="text-2xl">🛠️</div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Control Panel</h1>
              <p className="text-sm text-slate-400">Manage ideas, users & system</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('tu_jwt_token');
                localStorage.removeItem('tu_user_info');
                navigate('/login');
              }}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile overlay nav */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <nav className="absolute left-0 top-16 z-50 w-64 bg-slate-800/95 border-r border-slate-700/50 h-[calc(100vh-4rem)] p-4">
              <div className="flex justify-end">
                <button onClick={() => setMobileOpen(false)} className="mb-2 px-2 py-1 rounded bg-slate-700 text-white">Close</button>
              </div>
              <div className="space-y-2">
                {ADMIN_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      navigate(tab.path);
                      setMobileOpen(false);
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-3 rounded-lg transition-all duration-200 font-medium flex items-center space-x-3',
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    )}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>
        )}

        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:block md:w-64 bg-slate-800/50 border-r border-slate-700/50 md:min-h-screen md:sticky md:top-16 p-4">
          <div className="space-y-2">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={clsx(
                  'w-full text-left px-4 py-3 rounded-lg transition-all duration-200 font-medium flex items-center space-x-3',
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                )}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto md:ml-64">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboardLayout;
