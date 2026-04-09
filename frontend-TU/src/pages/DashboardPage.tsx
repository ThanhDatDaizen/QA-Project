// Dashboard Page
import React, { useEffect } from 'react';
import { useTuIdentity } from '../context/TuIdentityContext';
import { useDashboardStore } from '../store/tu-store';

export const DashboardPage: React.FC = () => {
  const { user } = useTuIdentity();
  const { stats, setStats } = useDashboardStore();

  useEffect(() => {
    console.log(
      '%c[DASHBOARD-PAGE] 📊 Loading dashboard...',
      'color: #0ea5e9; font-weight: bold;'
    );

    // Mock dashboard data
    setStats({
      totalIdeas: 42,
      totalUsers: 128,
      totalComments: 367,
      avgViewsPerIdea: 125,
      thisMonthIdeas: 8,
      approvalRate: 0.85,
    });
  }, []);

  return (
    <div className="bg-tu-dark-beast-900 min-h-screen">
      <div className="tu-container">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user?.username}! 👋</h1>
          <p className="text-tu-dark-beast-400">
            Dashboard for role: <span className="text-tu-primary-400 font-semibold">{user?.role}</span>
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              title="Total Ideas"
              value={stats.totalIdeas}
              icon="💡"
            />
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon="👥"
            />
            <StatCard
              title="Total Comments"
              value={stats.totalComments}
              icon="💬"
            />
            <StatCard
              title="Avg Views/Idea"
              value={Math.round(stats.avgViewsPerIdea)}
              icon="👁️"
            />
            <StatCard
              title="This Month"
              value={stats.thisMonthIdeas}
              icon="📅"
            />
            <StatCard
              title="Approval Rate"
              value={`${Math.round(stats.approvalRate * 100)}%`}
              icon="✅"
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="tu-card">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-tu-dark-beast-400 text-sm uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-tu-primary-400 mt-2">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );
};

export default DashboardPage;
