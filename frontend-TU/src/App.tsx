/**
 * TuApp - Main Application Component
 * Tôi thiết lập routing và context providers tại đây
 * Tất cả child components đều có access tới auth context và API service
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TuIdentityProvider, useTuIdentity } from './context/TuIdentityContext';
import { TuGuard } from './components/TuGuard';
import { useUIStore } from './store/tu-store';
import { getDashboardPath } from './utils/authUtils';
import './index.css';

// Import Actual Pages
import { IdeasPage } from './pages/IdeasPage';
import { CreateIdea } from './pages/CreateIdea';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminDashboardLayout } from './pages/admin/AdminDashboardLayout';
import { SupremeDashboardLayout } from './pages/admin/SupremeDashboardLayout';
import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { UserManagementPage } from './pages/superadmin/UserManagementPage';
import { UserDetailPage } from './pages/superadmin/UserDetailPage';
import { IdeaLogsPage } from './pages/superadmin/IdeaLogsPage';
import { AccessControlPage } from './pages/superadmin/AccessControlPage';
import { SystemLogsPage } from './pages/superadmin/SystemLogsPage';
import { ServerSettingsPage } from './pages/superadmin/ServerSettingsPage';
import { DepartmentManager } from './pages/superadmin/DepartmentManager';
import AcademicYearsPage from './pages/AcademicYearsPage';
import { QAManagerLayout } from './pages/qamanager/QAManagerLayout';
import { DashboardQA } from './pages/qamanager/DashboardQA';
import { CategoryManagement } from './pages/qamanager/CategoryManagement';
import { ReportsQA } from './pages/qamanager/ReportsQA';
import { IdeaReviewList } from './pages/qamanager/IdeaReviewList';
import { IdeaReviewDetail } from './pages/qamanager/IdeaReviewDetail';
import { ReportExportPage } from './pages/qamanager/ReportExportPage';
import { StaffLayout } from './pages/staff/StaffLayout';
import { IdeaFeed } from './pages/staff/IdeaFeed';
import { SubmitIdea } from './pages/staff/SubmitIdea';
import { MySubmissions } from './pages/staff/MySubmissions';
import { QACoordinatorLayout } from './pages/qacoordinator/QACoordinatorLayout';
import { TrackIdeas } from './pages/qacoordinator/TrackIdeas';
import { ManageTags } from './pages/qacoordinator/ManageTags';
import { ViewerLayout } from './pages/viewer/ViewerLayout';
import { IdeaDetail } from './pages/IdeaDetail';

// NotFoundPage - Keep this outside since it doesn't use auth
const NotFoundPage = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-white mb-4">404</h1>
      <p className="text-xl text-slate-400 mb-6">Page not found</p>
      <a href="/ideas" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Go Home</a>
    </div>
  </div>
);

/**
 * PowerLevelGuard Component - Guard routes based on power level
 */
interface PowerLevelGuardProps {
  minPower: number;
  children: React.ReactNode;
}

const PowerLevelGuard: React.FC<PowerLevelGuardProps> = ({ minPower, children }) => {
  const { user } = useTuIdentity();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if ((user.power || 0) < minPower) {
    console.warn(
      `%c[TU-GUARD] ⛔ Power level ${user.power} is insufficient. Required: ${minPower}`,
      'color: #ef4444; font-weight: bold;'
    );
    return <Navigate to="/ideas" replace />;
  }

  return <>{children}</>;
};

/**
 * AppRoutes Component - Define routes after auth context is setup
 */
const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useTuIdentity();

  console.log(
    '%c[TU-APP] 🚀 AppRoutes rendering...',
    'color: #0ea5e9; font-weight: bold;'
  );
  
  // 🔍 DEBUG: Log current user power for troubleshooting
  if (user) {
    console.log(`%c[TU-DEBUG] 👤 Current User: ${user.email} | 📊 Power: ${user.power} | 🎭 Role: ${user.role}`, 'color: #8b5cf6; font-weight: bold; font-size: 12px;');
  } else {
    console.log('%c[TU-DEBUG] ❓ No user logged in', 'color: #f59e0b; font-weight: bold; font-size: 12px;');
  }
  console.log(`%c[TU-DEBUG] Auth Status: ${isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}`, 'color: #06b6d4; font-size: 12px;');

  return (
    <Routes>
      {/* ========================================
          PUBLIC ROUTES - Match FIRST
          ======================================== */}
      
      {/* / - Smart redirect based on authentication status */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? (
            // 🔥 Authenticated: Redirect to dashboard based on power level
            (() => {
              console.log(
                '%c[TU-HOME] 🎯 Authenticated user at /, redirecting to dashboard',
                'color: #06b6d4; font-weight: bold;'
              );
              const dashboardPath = getDashboardPath(user?.power);
              console.log(`%c[TU-HOME] ↗️ → ${dashboardPath}`, 'color: #10b981; font-weight: bold;');
              return <Navigate to={dashboardPath} replace />;
            })()
          ) : (
            // Not authenticated: Go to login
            (() => {
              console.log(
                '%c[TU-HOME] 🔐 Unauthenticated user at /, redirecting to login',
                'color: #f59e0b; font-weight: bold;'
              );
              return <Navigate to="/login" replace />;
            })()
          )
        } 
      />

      {/* /login - Public route (redirect if already authenticated) */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      {/* /register - Public route (redirect if already authenticated) */}
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
        }
      />

      {/* ========================================
          AUTHENTICATED ROLE ROUTES - Match BEFORE /ideas
          ======================================== */}

      {/* 👑 SUPERADMIN (Power 20) Dashboard */}
      <Route
        path="/superadmin"
        element={
          <PowerLevelGuard minPower={20}>
            <SupremeDashboardLayout />
          </PowerLevelGuard>
        }
      >
        <Route index element={<SuperAdminDashboard />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="ideas" element={<IdeaLogsPage />} />
        <Route path="access" element={<AccessControlPage />} />
        <Route path="logs" element={<SystemLogsPage />} />
        <Route path="settings" element={<ServerSettingsPage />} />
        <Route path="departments" element={<DepartmentManager />} />
        <Route path="academic-years" element={<AcademicYearsPage />} />
      </Route>

      {/* 🛠️ ADMIN (Power 18) Dashboard */}
      <Route
        path="/admin"
        element={
          <PowerLevelGuard minPower={18}>
            <AdminDashboardLayout />
          </PowerLevelGuard>
        }
      >
        <Route path="users" element={<UserManagementPage />} />
        <Route path="users/:userId" element={<UserDetailPage />} />
        <Route path="ideas" element={<IdeaLogsPage />} />
        <Route path="access" element={<AccessControlPage />} />
        <Route path="logs" element={<SystemLogsPage />} />
        <Route path="settings" element={<ServerSettingsPage />} />
        <Route path="departments" element={<DepartmentManager />} />
        <Route path="academic-years" element={<AcademicYearsPage />} />
      </Route>

      {/* 🎯 QA MANAGER (Power 15) Dashboard */}
      <Route
        path="/qamanager"
        element={
          <PowerLevelGuard minPower={15}>
            <QAManagerLayout />
          </PowerLevelGuard>
        }
      >
        <Route index element={<DashboardQA />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="reports" element={<ReportsQA />} />
        <Route path="ideas" element={<IdeaReviewList />} />
          <Route path="ideas/:ideaId" element={<IdeaReviewDetail />} />
        <Route path="export" element={<ReportExportPage />} />
      </Route>

      {/* 🛡️ QA COORDINATOR (Power 10) Dashboard */}
      <Route
        path="/qacoordinator"
        element={
          <PowerLevelGuard minPower={10}>
            <QACoordinatorLayout />
          </PowerLevelGuard>
        }
      >
        <Route index element={<TrackIdeas />} />
        <Route path="track" element={<TrackIdeas />} />
        <Route path="tags" element={<ManageTags />} />
      </Route>

      {/* 👥 STAFF (Power 5) Dashboard */}
      <Route
        path="/staff"
        element={
          <PowerLevelGuard minPower={5}>
            <StaffLayout />
          </PowerLevelGuard>
        }
      >
        <Route index element={<IdeaFeed />} />
        <Route path="submit" element={<SubmitIdea />} />
        <Route path="myideas" element={<MySubmissions />} />
      </Route>

      {/* 👁️ VIEWER (Power 1) Dashboard */}
      <Route
        path="/viewer"
        element={
          <PowerLevelGuard minPower={1}>
            <ViewerLayout />
          </PowerLevelGuard>
        }
      >
        <Route index element={<div className="text-white">📚 Browse Approved Ideas - Read Only</div>} />
      </Route>

      {/* ========================================
          GENERIC AUTHENTICATED ROUTES - Match LAST
          ======================================== */}

      {/* /ideas - Generic ideas list (fallback for unauthenticated/low power users) */}
      <Route
        path="/ideas"
        element={
          <TuGuard>
            <IdeasPage />
          </TuGuard>
        }
      />

      {/* /ideas/create - Create new idea */}
      <Route
        path="/ideas/create"
        element={
          <TuGuard>
            <CreateIdea />
          </TuGuard>
        }
      />

      {/* /ideas/:id - View idea detail */}
      <Route
        path="/ideas/:id"
        element={
          <PowerLevelGuard minPower={1}>
            <IdeaDetail />
          </PowerLevelGuard>
        }
      />

      {/* ========================================
          ERROR ROUTES - Match LAST
          ======================================== */}

      {/* /404 - Not found page */}
      <Route path="/404" element={<NotFoundPage />} />

      {/* * - Catch all undefined routes */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

/**
 * App Component - Root Component
 */
function App() {
  const setDarkMode = useUIStore((state) => state.setDarkMode);

  // Initialize dark mode on mount
  useEffect(() => {
    console.log(
      '%c[TU-APP] 🎨 Initializing dark mode...',
      'color: #8b5cf6;'
    );
    setDarkMode(true);

    // Load language preference
    const savedLang = localStorage.getItem('tu_language');
    if (savedLang) {
      console.log(`%c[TU-APP] 🌐 Language loaded: ${savedLang}`, 'color: #0ea5e9;');
    }
  }, [setDarkMode]);

  return (
    <TuIdentityProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#0f0f1e] text-white">
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-4">
            <AppRoutes />
          </div>
        </div>
      </Router>
    </TuIdentityProvider>
  );
}

export default App;
