// ===================================================
// QA MANAGER DASHBOARD - Statistics & Overview
// ===================================================

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';

export const DashboardQA: React.FC = () => {
  // ===================================================
  // Mock Data - Ideas by Department & Status
  // ===================================================
  const departmentStats = useMemo(() => [
    { department: 'IT', total: 45, approved: 28, pending: 12, rejected: 5 },
    { department: 'Finance', total: 32, approved: 20, pending: 8, rejected: 4 },
    { department: 'HR', total: 28, approved: 18, pending: 7, rejected: 3 },
    { department: 'Marketing', total: 35, approved: 22, pending: 10, rejected: 3 },
    { department: 'Operations', total: 42, approved: 26, pending: 12, rejected: 4 },
  ], []);

  const statusDistribution = useMemo(() => [
    { name: 'Approved', value: 114, color: '#10b981' },
    { name: 'Pending', value: 49, color: '#f59e0b' },
    { name: 'Rejected', value: 19, color: '#ef4444' },
  ], []);

  const totalIdeas = useMemo(() => {
    return departmentStats.reduce((sum, dept) => sum + dept.total, 0);
  }, [departmentStats]);

  const totalApproved = useMemo(() => {
    return departmentStats.reduce((sum, dept) => sum + dept.approved, 0);
  }, [departmentStats]);

  const approvalRate = useMemo(() => {
    return ((totalApproved / totalIdeas) * 100).toFixed(1);
  }, [totalApproved, totalIdeas]);

  // ===================================================
  // Stat Card Component
  // ===================================================
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color: string;
  }> = ({ title, value, icon, trend, color }) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {trend && (
            <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
              <TrendingUp size={14} />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-900/30')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  console.log(
    '%c[TU-QA-DASHBOARD] 📊 QA Dashboard loaded',
    'color: #0ea5e9; font-weight: bold;'
  );
  console.log('📈 Department Statistics:', departmentStats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">QA Manager Dashboard</h1>
        <p className="text-slate-400">Monitor idea submissions and approval metrics across all departments</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ideas"
          value={totalIdeas}
          icon={<FileText size={24} className="text-blue-400" />}
          trend="+12% from last month"
          color="text-blue-400"
        />
        <StatCard
          title="Approved"
          value={totalApproved}
          icon={<CheckCircle size={24} className="text-green-400" />}
          trend={`${approvalRate}% approval rate`}
          color="text-green-400"
        />
        <StatCard
          title="Departments"
          value="5"
          icon={<Users size={24} className="text-cyan-400" />}
          color="text-cyan-400"
        />
        <StatCard
          title="Pending Review"
          value={49}
          icon={<TrendingUp size={24} className="text-yellow-400" />}
          trend="Action required"
          color="text-yellow-400"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Ideas by Department */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Ideas by Department</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="department" stroke="#94a3b8" />
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
              <Bar dataKey="approved" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              <Bar dataKey="rejected" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Status Distribution */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Details Table */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Department Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr className="border-b border-slate-700">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">Total Ideas</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">Approved</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">Pending</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">Rejected</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">Rate %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {departmentStats.map((dept, idx) => {
                const rate = ((dept.approved / dept.total) * 100).toFixed(1);
                return (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">{dept.department}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{dept.total}</td>
                    <td className="px-6 py-4 text-sm text-green-400 font-semibold">{dept.approved}</td>
                    <td className="px-6 py-4 text-sm text-yellow-400 font-semibold">{dept.pending}</td>
                    <td className="px-6 py-4 text-sm text-red-400 font-semibold">{dept.rejected}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-xs font-semibold">
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
