// ===================================================
// SuperAdminDashboard.tsx - Supreme Command Center Dashboard
// Display stats cards and latest ideas for SuperAdmin
// ===================================================

import React, { useEffect, useState } from 'react';
import { useIdeas } from '../../hooks/useIdeas';
import { ideasAPI, usersAPI, departmentsAPI } from '../../api/tu-api-endpoints';
import EventSystem from '../../services/eventSystem';

export const SuperAdminDashboard: React.FC = () => {
  const { ideas, loading: ideasLoading, fetchIdeas } = useIdeas({ pageSize: 10 });
  
  const [stats, setStats] = useState({
    totalIdeas: 0,
    totalUsers: 0,
    totalDepartments: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoadingStats(true);

        // Fetch ideas
        await fetchIdeas(1, 'newest');

        // Fetch users count
        const usersResponse = await usersAPI.list({ limit: 1 });
        const usersCount = (usersResponse as any)?.length || (usersResponse as any)?.data?.length || 0;

        // Fetch departments count
        const deptsResponse = await departmentsAPI.list();
        const deptsCount = Array.isArray(deptsResponse) ? deptsResponse.length : (deptsResponse as any)?.length || 0;

        // Fetch ideas count
        const ideasResponse = await ideasAPI.list({ limit: 1 });
        const ideasCount = (ideasResponse as any)?.length || (ideasResponse as any)?.data?.length || 0;

        setStats({
          totalIdeas: ideasCount,
          totalUsers: usersCount,
          totalDepartments: deptsCount,
        });

        console.log('[SUPERADMIN-DASHBOARD] Stats loaded:', { usersCount, deptsCount, ideasCount });
      } catch (error) {
        console.error('[SUPERADMIN-DASHBOARD] Error loading dashboard data:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadDashboardData();
  }, [fetchIdeas]);

  // Subscribe to data refresh events from Terminal
  useEffect(() => {
    const unsubscribe = EventSystem.subscribeToRefresh(async (type) => {
      console.log('[SUPERADMIN-DASHBOARD] 🔄 Refresh triggered for:', type);

      try {
        if (type === 'ideas' || type === 'all') {
          await fetchIdeas(1, 'newest');
        }

        if (type === 'users' || type === 'all') {
          const usersResponse = await usersAPI.list({ limit: 1 });
          const usersCount = (usersResponse as any)?.length || (usersResponse as any)?.data?.length || 0;
          setStats((prev) => ({ ...prev, totalUsers: usersCount }));
        }

        if (type === 'all') {
          // Refresh departments count
          const deptsResponse = await departmentsAPI.list();
          const deptsCount = Array.isArray(deptsResponse) ? deptsResponse.length : (deptsResponse as any)?.length || 0;

          // Refresh ideas count
          const ideasResponse = await ideasAPI.list({ limit: 1 });
          const ideasCount = (ideasResponse as any)?.length || (ideasResponse as any)?.data?.length || 0;

          setStats((prev) => ({
            ...prev,
            totalIdeas: ideasCount,
            totalDepartments: deptsCount,
          }));
        }

        console.log('[SUPERADMIN-DASHBOARD] ✅ Refresh completed');
      } catch (error) {
        console.error('[SUPERADMIN-DASHBOARD] Error refreshing data:', error);
      }
    });

    return unsubscribe;
  }, [fetchIdeas]);

  return (
    <div style={{ marginLeft: 0, paddingLeft: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1">Command Center Dashboard</h1>
        <p className="text-slate-400">System overview and management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
        {/* Total Ideas Card */}
        <div
          className="p-6 rounded-lg border border-purple-500/20 transition-all hover:border-purple-500/40 cursor-default"
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Ideas</p>
              <p className="text-3xl font-bold text-white">{loadingStats ? '...' : stats.totalIdeas}</p>
            </div>
            <div className="text-4xl opacity-30">💡</div>
          </div>
          <p className="text-slate-500 text-xs mt-3">All ideas in system</p>
        </div>

        {/* Total Users Card */}
        <div
          className="p-6 rounded-lg border border-pink-500/20 transition-all hover:border-pink-500/40 cursor-default"
          style={{
            background: 'rgba(236, 72, 153, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Users</p>
              <p className="text-3xl font-bold text-white">{loadingStats ? '...' : stats.totalUsers}</p>
            </div>
            <div className="text-4xl opacity-30">👥</div>
          </div>
          <p className="text-slate-500 text-xs mt-3">Registered users</p>
        </div>

        {/* Total Departments Card */}
        <div
          className="p-6 rounded-lg border border-cyan-500/20 transition-all hover:border-cyan-500/40 cursor-default"
          style={{
            background: 'rgba(34, 211, 238, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Total Departments</p>
              <p className="text-3xl font-bold text-white">{loadingStats ? '...' : stats.totalDepartments}</p>
            </div>
            <div className="text-4xl opacity-30">🏢</div>
          </div>
          <p className="text-slate-500 text-xs mt-3">Organization units</p>
        </div>
      </div>

      {/* Latest Ideas Table */}
      <div
        className="rounded-lg border border-purple-500/20 overflow-hidden w-full"
        style={{
          background: 'rgba(139, 92, 246, 0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="px-6 py-4 border-b border-purple-500/20">
          <h2 className="text-xl font-bold text-white">Latest Ideas</h2>
        </div>

        {ideasLoading ? (
          <div className="p-8 text-center text-slate-400">Loading ideas...</div>
        ) : ideas && ideas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Title</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Author</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Date</th>
                </tr>
              </thead>
              <tbody>
                {ideas.map((idea: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-t border-purple-500/10 hover:bg-purple-500/5 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm text-white truncate">{idea.title}</td>
                    <td className="px-6 py-3 text-sm text-slate-300">{idea.author_name || 'Unknown'}</td>
                    <td className="px-6 py-3 text-sm text-slate-400">{idea.department}</td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          idea.status === 'Approved'
                            ? 'bg-green-500/30 text-green-300'
                            : idea.status === 'Rejected'
                            ? 'bg-red-500/30 text-red-300'
                            : 'bg-yellow-500/30 text-yellow-300'
                        }`}
                      >
                        {idea.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {new Date(idea.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">No ideas found</div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
