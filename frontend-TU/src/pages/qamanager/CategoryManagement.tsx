// ===================================================
// CATEGORY MANAGEMENT - QA Manager Category Control
// ===================================================

import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, Plus, Calendar, Lock } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string;
  closureDate: string;
  status: 'Active' | 'Closed' | 'Archived';
  submissionCount: number;
  createdDate: string;
}

export const CategoryManagement: React.FC = () => {
  // ===================================================
  // Mock Categories Data
  // ===================================================
  const [categories] = useState<Category[]>([
    {
      id: '1',
      name: 'Process Optimization',
      description: 'Ideas to streamline business processes',
      closureDate: '2025-02-28',
      status: 'Active',
      submissionCount: 24,
      createdDate: '2025-01-15',
    },
    {
      id: '2',
      name: 'Cost Reduction',
      description: 'Cost-saving initiatives and opportunities',
      closureDate: '2025-03-15',
      status: 'Active',
      submissionCount: 18,
      createdDate: '2025-01-20',
    },
    {
      id: '3',
      name: 'Innovation',
      description: 'New product and service ideas',
      closureDate: '2025-04-30',
      status: 'Active',
      submissionCount: 42,
      createdDate: '2025-01-10',
    },
    {
      id: '4',
      name: 'Employee Wellness',
      description: 'Ideas for workplace culture and wellness',
      closureDate: '2024-12-31',
      status: 'Closed',
      submissionCount: 15,
      createdDate: '2024-11-01',
    },
    {
      id: '5',
      name: 'Sustainability',
      description: 'Green initiatives and environmental ideas',
      closureDate: '2025-05-31',
      status: 'Active',
      submissionCount: 31,
      createdDate: '2025-01-05',
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ===================================================
  // Calculate Stats
  // ===================================================
  const stats = useMemo(() => {
    const active = categories.filter((c) => c.status === 'Active').length;
    const closed = categories.filter((c) => c.status === 'Closed').length;
    const totalSubmissions = categories.reduce((sum, c) => sum + c.submissionCount, 0);

    return { active, closed, totalSubmissions };
  }, [categories]);

  // ===================================================
  // Stat Card
  // ===================================================
  const StatCard: React.FC<{
    title: string;
    value: number | string;
    color: string;
  }> = ({ title, value, color }) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );

  // ===================================================
  // Handler: Delete Category
  // ===================================================
  const handleDelete = (id: string) => {
    console.log(`%c[TU-QA] 🗑️ Deleting category ${id}`, 'color: #ef4444; font-weight: bold;');
  };

  // ===================================================
  // Handler: Edit Category
  // ===================================================
  const handleEdit = (id: string) => {
    console.log(`%c[TU-QA] ✏️ Editing category ${id}`, 'color: #0ea5e9; font-weight: bold;');
    setEditingId(id);
  };

  console.log(
    '%c[TU-QA-CATEGORIES] 📁 Category Management loaded',
    'color: #0ea5e9; font-weight: bold;'
  );
  console.log('📊 Categories Data:', categories);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Category Management</h1>
          <p className="text-slate-400">
            Create and manage idea submission categories with closure deadlines
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
        >
          <Plus size={20} />
          New Category
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Active Categories" value={stats.active} color="text-green-400" />
        <StatCard title="Closed Categories" value={stats.closed} color="text-red-400" />
        <StatCard title="Total Submissions" value={stats.totalSubmissions} color="text-blue-400" />
      </div>

      {/* Create Form (Collapsed) */}
      {showCreateForm && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 space-y-4">
          <h2 className="text-xl font-bold text-white">Create New Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Category name"
              className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
            <input
              type="text"
              placeholder="Description"
              className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 outline-none"
            />
            <input
              type="date"
              className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-cyan-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-medium"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Categories</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr className="border-b border-slate-700">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Closure Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Submissions
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {categories.map((category) => {
                const daysLeft = Math.ceil(
                  (new Date(category.closureDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                return (
                  <tr
                    key={category.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{category.name}</p>
                      <p className="text-xs text-slate-500">
                        Created: {category.createdDate}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {category.description}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar size={14} />
                        {category.closureDate}
                        {category.status === 'Active' && (
                          <span className="text-xs text-yellow-400 ml-2">
                            ({daysLeft} days left)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          category.status === 'Active'
                            ? 'bg-green-900/30 text-green-400'
                            : category.status === 'Closed'
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {category.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      <span className="px-3 py-1 bg-slate-700/50 rounded-lg">
                        {category.submissionCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(category.id)}
                          disabled={editingId === category.id || category.status === 'Closed'}
                          className="p-2 hover:bg-blue-900/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            category.status === 'Closed'
                              ? 'Cannot edit closed category'
                              : 'Edit category'
                          }
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          disabled={category.status === 'Closed'}
                          className="p-2 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            category.status === 'Closed'
                              ? 'Cannot delete closed category'
                              : 'Delete category'
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                        {category.status === 'Closed' && (
                          <Lock size={16} className="text-slate-500" />
                        )}
                      </div>
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
