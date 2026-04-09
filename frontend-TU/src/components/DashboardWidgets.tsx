/**
 * DashboardWidgets.tsx - Dashboard sections for Supreme Control Center
 * Stats, Ideas, Users, Departments in one page
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

interface StatsData {
  totalIdeas: number;
  approvedIdeas: number;
  pendingIdeas: number;
  totalUsers: number;
  activeUsers: number;
}

interface Idea {
  _id: string;
  id: string;
  title: string;
  description: string;
  status: string;
  creator?: string;
  createdAt?: string;
}

interface User {
  _id?: string;
  id?: string;
  email: string;
  username: string;
  role: string;
  power?: number;
  is_active: boolean;
}

interface Department {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  head?: string;
  _count?: number;
}

export const StatsWidget: React.FC<{ stats: StatsData }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="text-blue-400 text-sm font-semibold">Total Ideas</div>
        <div className="text-3xl font-bold text-blue-300 mt-2">{stats.totalIdeas}</div>
      </div>

      <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="text-green-400 text-sm font-semibold">✅ Approved</div>
        <div className="text-3xl font-bold text-green-300 mt-2">{stats.approvedIdeas}</div>
      </div>

      <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="text-yellow-400 text-sm font-semibold">⏳ Pending</div>
        <div className="text-3xl font-bold text-yellow-300 mt-2">{stats.pendingIdeas}</div>
      </div>

      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="text-purple-400 text-sm font-semibold">Total Users</div>
        <div className="text-3xl font-bold text-purple-300 mt-2">{stats.totalUsers}</div>
      </div>

      <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-lg p-4 backdrop-blur-sm">
        <div className="text-cyan-400 text-sm font-semibold">🟢 Active</div>
        <div className="text-3xl font-bold text-cyan-300 mt-2">{stats.activeUsers}</div>
      </div>
    </div>
  );
};

export const IdeasWidget: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const response = await axios.get(`${API_BASE}/ideas`);
        setIdeas(response.data.slice(0, 5)); // Show top 5
        setLoading(false);
      } catch (error) {
        console.error('Error fetching ideas:', error);
        setLoading(false);
      }
    };

    fetchIdeas();
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <span>💡</span>
        <span>Recent Ideas</span>
      </h3>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : ideas.length === 0 ? (
        <div className="text-slate-400">No ideas found</div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea._id || idea.id}
              className="bg-slate-900/50 border border-slate-700/30 rounded p-3 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white font-semibold truncate">{idea.title}</p>
                  <p className="text-slate-400 text-sm truncate">{idea.description}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2 ${
                    idea.status === 'APPROVED'
                      ? 'bg-green-500/20 text-green-300'
                      : idea.status === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {idea.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const UsersWidget: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_BASE}/users`);
        setUsers(response.data.slice(0, 5)); // Show top 5
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getPowerColor = (power?: number) => {
    if (!power) return 'text-slate-400';
    if (power >= 18) return 'text-red-400';
    if (power >= 15) return 'text-yellow-400';
    if (power >= 10) return 'text-purple-400';
    if (power >= 5) return 'text-blue-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <span>👥</span>
        <span>Recent Users</span>
      </h3>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-slate-400">No users found</div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user._id || user.id}
              className="bg-slate-900/50 border border-slate-700/30 rounded p-3 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{user.email}</p>
                  <p className="text-slate-400 text-sm">{user.role}</p>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-lg ${getPowerColor(user.power)}`}>
                    {user.power || 0}
                  </div>
                  <div className={`text-xs ${user.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {user.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DepartmentsWidget: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${API_BASE}/departments`);
        setDepartments(response.data.slice(0, 4)); // Show top 4
        setLoading(false);
      } catch (error) {
        console.error('Error fetching departments:', error);
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <span>🏢</span>
        <span>Departments</span>
      </h3>

      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : departments.length === 0 ? (
        <div className="text-slate-400">No departments found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {departments.map((dept) => (
            <div
              key={dept._id || dept.id}
              className="bg-slate-900/50 border border-slate-700/30 rounded p-4 hover:border-slate-600/50 transition-colors"
            >
              <p className="text-white font-semibold">{dept.name}</p>
              <p className="text-slate-400 text-sm">{dept.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
