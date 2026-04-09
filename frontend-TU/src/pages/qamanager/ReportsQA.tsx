// ===================================================
// QA MANAGER REPORTS - Analytics & Performance Metrics
// ===================================================

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, Calendar, Target, AlertCircle } from 'lucide-react';

export const ReportsQA: React.FC = () => {
  // ===================================================
  // Mock Data - Monthly Submissions Trend
  // ===================================================
  const monthlyTrend = useMemo(() => [
    { month: 'Jan', submissions: 32, approved: 20, rejected: 5 },
    { month: 'Feb', submissions: 45, approved: 28, rejected: 8 },
    { month: 'Mar', submissions: 52, approved: 33, rejected: 10 },
    { month: 'Apr', submissions: 48, approved: 30, rejected: 9 },
    { month: 'May', submissions: 61, approved: 38, rejected: 12 },
    { month: 'Jun', submissions: 58, approved: 36, rejected: 11 },
  ], []);

  // ===================================================
  // Mock Data - Department Performance
  // ===================================================
  const departmentPerformance = useMemo(() => [
    { dept: 'IT', avg_time: 4.2, satisfaction: 92, submissions: 45 },
    { dept: 'Finance', avg_time: 3.8, satisfaction: 88, submissions: 32 },
    { dept: 'HR', avg_time: 5.1, satisfaction: 85, submissions: 28 },
    { dept: 'Marketing', avg_time: 3.5, satisfaction: 94, submissions: 35 },
    { dept: 'Operations', avg_time: 4.5, satisfaction: 87, submissions: 42 },
  ], []);

  // ===================================================
  // Mock Data - Approval Timeline
  // ===================================================
  const approvalTimeline = useMemo(() => [
    { week: 'Week 1', processed: 8, pending: 12, average_days: 2.5 },
    { week: 'Week 2', processed: 12, pending: 10, average_days: 2.3 },
    { week: 'Week 3', processed: 10, pending: 8, average_days: 2.8 },
    { week: 'Week 4', processed: 14, pending: 6, average_days: 2.2 },
  ], []);

  // ===================================================
  // Calculate Stats
  // ===================================================
  const stats = useMemo(() => {
    const totalSubmissions = monthlyTrend.reduce((sum, m) => sum + m.submissions, 0);
    const totalApproved = monthlyTrend.reduce((sum, m) => sum + m.approved, 0);
    const avgApprovalRate = ((totalApproved / totalSubmissions) * 100).toFixed(1);
    const avgProcessingTime = (
      approvalTimeline.reduce((sum, w) => sum + w.average_days, 0) / approvalTimeline.length
    ).toFixed(1);

    return { totalSubmissions, totalApproved, avgApprovalRate, avgProcessingTime };
  }, [monthlyTrend, approvalTimeline]);

  // ===================================================
  // Stat Card Component
  // ===================================================
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    change?: string;
    color: string;
  }> = ({ title, value, icon, change, color }) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {change && (
            <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
              <TrendingUp size={12} />
              {change}
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-900/30')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  console.log(
    '%c[TU-QA-REPORTS] 📊 Reports page loaded',
    'color: #0ea5e9; font-weight: bold;'
  );
  console.log('📈 Monthly Trend:', monthlyTrend);
  console.log('🏢 Department Performance:', departmentPerformance);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
        <p className="text-slate-400">
          Comprehensive performance metrics and approval trends
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Submissions"
          value={stats.totalSubmissions}
          icon={<Target size={20} className="text-blue-400" />}
          change="+15% vs last period"
          color="text-blue-400"
        />
        <StatCard
          title="Approved Ideas"
          value={stats.totalApproved}
          icon={<TrendingUp size={20} className="text-green-400" />}
          change={`${stats.avgApprovalRate}% approval rate`}
          color="text-green-400"
        />
        <StatCard
          title="Avg Processing Time"
          value={`${stats.avgProcessingTime}d`}
          icon={<Calendar size={20} className="text-yellow-400" />}
          change="−0.3 days vs target"
          color="text-yellow-400"
        />
        <StatCard
          title="Pending Review"
          value={approvalTimeline[approvalTimeline.length - 1].pending}
          icon={<AlertCircle size={20} className="text-orange-400" />}
          change="Action required"
          color="text-orange-400"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend - Area Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Monthly Submissions Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="submissions"
                stroke="#0ea5e9"
                fill="#0ea5e9"
                fillOpacity={0.1}
                name="Submissions"
              />
              <Area
                type="monotone"
                dataKey="approved"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
                name="Approved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Performance - Bar Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Department Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="dept" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Bar dataKey="satisfaction" fill="#0ea5e9" name="Satisfaction %" radius={[8, 8, 0, 0]} />
              <Bar dataKey="avg_time" fill="#f59e0b" name="Avg Time (days)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Approval Timeline - Line Chart */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Weekly Approval Timeline</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={approvalTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="week" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="processed"
                stroke="#10b981"
                strokeWidth={2}
                name="Processed"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="pending"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Pending"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="average_days"
                stroke="#0ea5e9"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Avg Days"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Department Metrics</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr className="border-b border-slate-700">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Submissions
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Avg Processing Time
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Satisfaction
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {departmentPerformance.map((dept, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-white font-medium">{dept.dept}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{dept.submissions}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    <span className="px-3 py-1 bg-slate-700/50 rounded">
                      {dept.avg_time} days
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        dept.satisfaction >= 90
                          ? 'bg-green-900/30 text-green-400'
                          : dept.satisfaction >= 85
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {dept.satisfaction}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {dept.avg_time <= 4 ? (
                      <span className="text-green-400 font-semibold">✓ On Track</span>
                    ) : (
                      <span className="text-yellow-400 font-semibold">⚠️ Needs Review</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
