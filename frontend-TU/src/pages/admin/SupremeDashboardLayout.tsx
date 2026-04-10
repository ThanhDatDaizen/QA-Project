// ===================================================
// SupremeDashboardLayout.tsx - Supreme Command Center (HYBRID)
// Tabs + Data Pages (Top) + Terminal CLI (Bottom)
// Only SUPERADMIN can access - Power Level 20 👑
// ===================================================

import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTuIdentity } from '../../context/TuIdentityContext';
import { TerminalCLI } from '../../components/TerminalCLI';
import EventSystem from '../../services/eventSystem';

interface AdminTab {
  id: string;
  label: string;
  icon: string;
  path: string;
  description: string;
}

const ADMIN_TABS: AdminTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/superadmin',
    description: 'System overview & statistics',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: '👥',
    path: '/superadmin/users',
    description: 'Manage users & permissions',
  },
  {
    id: 'ideas',
    label: 'Idea Management',
    icon: '💡',
    path: '/superadmin/ideas',
    description: 'Review & manage ideas',
  },
  {
    id: 'access',
    label: 'Access Control',
    icon: '🔐',
    path: '/superadmin/access',
    description: 'Control access & roles',
  },
  {
    id: 'logs',
    label: 'System Logs',
    icon: '📝',
    path: '/superadmin/logs',
    description: 'View system activity logs',
  },
  {
    id: 'settings',
    label: 'Server Settings',
    icon: '⚙️',
    path: '/superadmin/settings',
    description: 'Configure server settings',
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: '🏢',
    path: '/superadmin/departments',
    description: 'Manage departments',
  },
  {
    id: 'academic-years',
    label: 'Academic Years',
    icon: '📅',
    path: '/superadmin/academic-years',
    description: 'Manage academic years & deadlines',
  },
];

export const SupremeDashboardLayout: React.FC = () => {
  const { isAuthenticated, user } = useTuIdentity();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    console.log(
      '%c[TU-SUPERADMIN] Entering Supreme ICMS Command Center',
      'color: #ffd700; font-weight: bold; font-size: 16px;'
    );
  }, []);

  // 🔒 Role check - Check Power Level (SuperAdmin only needs power 20)
  if (!isAuthenticated || (user?.power || 0) < 20) {
    console.warn(
      `%c[TU-SUPERADMIN] Access Denied! User power: ${user?.power} (required: 20)`,
      'color: #ff0000; font-weight: bold;'
    );
    EventSystem.logError(`Access denied for user with power ${user?.power}`);
    return <Navigate to="/ideas" replace />;
  }

  // Determine current active tab based on current location
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === '/superadmin') return 'dashboard';
    if (path === '/superadmin/users') return 'users';
    if (path.startsWith('/superadmin/users')) return 'users';
    if (path === '/superadmin/ideas') return 'ideas';
    if (path === '/superadmin/access') return 'access';
    if (path === '/superadmin/logs') return 'logs';
    if (path === '/superadmin/settings') return 'settings';
    if (path === '/superadmin/departments') return 'departments';
    return 'dashboard';
  };

  const activeTab = getCurrentTab();

  const handleTabClick = (path: string, tabLabel: string) => {
    EventSystem.logUIAction('Navigation', `clicked ${tabLabel}`);
    navigate(path);
  };

  const handleLogout = () => {
    EventSystem.logSystem('Logout initiated');
    localStorage.removeItem('tu_jwt_token');
    localStorage.removeItem('tu_user_info');
    navigate('/login');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'linear-gradient(to bottom right, rgb(5, 5, 15), rgb(45, 12, 65), rgb(5, 5, 15))' }}>
      {/* ========== HEADER - FULL WIDTH ========== */}
      <header style={{ background: 'linear-gradient(to right, rgba(15, 12, 50, 0.8), rgba(0, 0, 0, 0.8))', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', zIndex: 50, flexShrink: 0, width: '100vw', boxSizing: 'border-box' }}>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-2xl hover:text-purple-400 transition-colors hidden md:inline"
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              {sidebarOpen ? '☰' : '→'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-2xl hover:text-purple-400 transition-colors md:hidden"
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              ☰
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '18px' }}>ICMS</div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'rgb(196, 181, 253)', margin: 0 }}>
                  Command Center
                </h1>
                <p style={{ fontSize: '12px', color: 'rgb(100, 116, 139)', margin: 0 }}>Hybrid Dashboard</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
              <p style={{ fontSize: '12px', color: 'rgb(148, 163, 184)', margin: 0 }}>Power: {user?.power || 0}</p>
            </div>
            <button
              onClick={handleLogout}
              style={{ padding: '8px 16px', background: 'rgba(220, 38, 38, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'rgb(248, 113, 113)', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ========== MAIN CONTAINER (Sidebar + Dashboard) - FULL WIDTH ========== */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', width: '100vw', boxSizing: 'border-box' }}>
        {/* ========== SIDEBAR - FIXED WIDTH ========== */}
        {/* Mobile overlay nav */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute left-0 top-16 z-50 w-64 bg-[rgba(15,12,50,0.95)] border-r border-[rgba(168,85,247,0.2)] h-[calc(100vh-4rem)] p-3">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ADMIN_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { handleTabClick(tab.path, tab.label); setMobileMenuOpen(false); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      transition: 'all 0.2s',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      border: 'none',
                      cursor: 'pointer',
                      background: activeTab === tab.id ? 'linear-gradient(to right, rgb(147, 51, 234), rgb(236, 72, 153))' : 'transparent',
                      color: activeTab === tab.id ? 'white' : 'rgb(203, 213, 225)',
                    }}
                    title={tab.label}
                  >
                    <span style={{ flexShrink: 0 }}>{tab.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar Navigation */}
        <nav className="hidden md:block" style={{
          background: 'linear-gradient(to bottom, rgba(15, 12, 50, 0.5), rgba(0, 0, 0, 0.5))',
          borderRight: '1px solid rgba(168, 85, 247, 0.2)',
          transition: 'all 0.3s',
          overflowY: 'auto',
          flexShrink: 0,
          width: sidebarOpen ? '260px' : '60px',
          boxSizing: 'border-box',
          padding: '12px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path, tab.label)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab.id 
                    ? 'linear-gradient(to right, rgb(147, 51, 234), rgb(236, 72, 153))' 
                    : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'rgb(203, 213, 225)',
                }}
                title={tab.label}
              >
                <span style={{ flexShrink: 0 }}>{tab.icon}</span>
                {sidebarOpen && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>}
              </button>
            ))}
          </div>
        </nav>

        {/* ========== DASHBOARD CONTENT AREA - FULL FLEX WIDTH ========== */}
        <main style={{ flex: 1, overflowY: 'auto', boxSizing: 'border-box', padding: '20px', paddingBottom: '30vh' }}>
          <Outlet />
        </main>
      </div>

      {/* ========== TERMINAL - FIXED AT BOTTOM ========== */}
      <div className="hidden md:block">
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            width: '100vw',
            height: '25vh',
            zIndex: 9999,
            boxSizing: 'border-box',
            background: 'rgba(15, 15, 15, 0.75) !important',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
          }}
        >
          <TerminalCLI />
        </div>
      </div>
    </div>
  );
};

export default SupremeDashboardLayout;
