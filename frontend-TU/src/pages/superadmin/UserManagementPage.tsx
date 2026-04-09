// ===================================================
// UserManagementPage.tsx - Trang quản lý người dùng
// Quản lý role, ban/unban user
// ===================================================

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

interface User {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'STAFF' | 'QA_MANAGER' | 'ADMIN';
  status: 'active' | 'banned' | 'suspended';
  joinDate: string;
  lastActive: string;
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Developer',
    email: 'john@example.com',
    department: 'IT',
    role: 'STAFF',
    status: 'active',
    joinDate: '2024-01-15',
    lastActive: '2024-04-08',
  },
  {
    id: '2',
    name: 'Sarah Quality',
    email: 'sarah@example.com',
    department: 'QA',
    role: 'QA_MANAGER',
    status: 'active',
    joinDate: '2024-02-10',
    lastActive: '2024-04-07',
  },
  {
    id: '3',
    name: 'Mike Security',
    email: 'mike@example.com',
    department: 'Security',
    role: 'STAFF',
    status: 'banned',
    joinDate: '2024-01-20',
    lastActive: '2024-03-15',
  },
  {
    id: '4',
    name: 'Alex Admin',
    email: 'alex@example.com',
    department: 'Management',
    role: 'ADMIN',
    status: 'active',
    joinDate: '2023-12-01',
    lastActive: '2024-04-08',
  },
  {
    id: '5',
    name: 'Lisa Designer',
    email: 'lisa@example.com',
    department: 'Design',
    role: 'STAFF',
    status: 'active',
    joinDate: '2024-03-01',
    lastActive: '2024-04-06',
  },
];

const getRoleColor = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-600/20 text-red-300 border-red-600/50';
    case 'QA_MANAGER':
      return 'bg-blue-600/20 text-blue-300 border-blue-600/50';
    case 'STAFF':
      return 'bg-slate-600/20 text-slate-300 border-slate-600/50';
    default:
      return 'bg-slate-600/20 text-slate-300 border-slate-600/50';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return { icon: '🟢', text: 'Active', color: 'text-green-400' };
    case 'banned':
      return { icon: '🚫', text: 'Banned', color: 'text-red-400' };
    case 'suspended':
      return { icon: '⏸️', text: 'Suspended', color: 'text-yellow-400' };
    default:
      return { icon: '❓', text: 'Unknown', color: 'text-slate-400' };
  }
};

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<{ userId: string; action: 'ban' | 'unban' | 'role' } | null>(null);

  useEffect(() => {
    console.log('[TU-ADMIN]: Đang tải danh sách nhân sự...');
  }, []);

  const changeRole = (userId: string, newRole: 'STAFF' | 'QA_MANAGER' | 'ADMIN') => {
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, role: newRole } : user
    );
    setUsers(updatedUsers);
    console.log(`[TU-ADMIN]: 👑 Changed role for user ${userId} to ${newRole}`);
    setEditingUserId(null);
  };

  const banUser = (userId: string) => {
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, status: 'banned' as const } : user
    );
    setUsers(updatedUsers);
    console.log(`[TU-ADMIN]: 🚫 User ${userId} has been banned`);
    setShowConfirmModal(null);
  };

  const unbanUser = (userId: string) => {
    const updatedUsers = users.map((user) =>
      user.id === userId ? { ...user, status: 'active' as const } : user
    );
    setUsers(updatedUsers);
    console.log(`[TU-ADMIN]: ✅ User ${userId} has been unbanned`);
    setShowConfirmModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span>👥</span>
          <span>User Management</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">Manage user roles, departments, and access</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="bg-green-600/20 border border-green-600/50 rounded-lg p-4">
          <p className="text-green-300 text-sm">Active</p>
          <p className="text-2xl font-bold text-green-300">{users.filter(u => u.status === 'active').length}</p>
        </div>
        <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
          <p className="text-red-300 text-sm">Banned</p>
          <p className="text-2xl font-bold text-red-300">{users.filter(u => u.status === 'banned').length}</p>
        </div>
        <div className="bg-blue-600/20 border border-blue-600/50 rounded-lg p-4">
          <p className="text-blue-300 text-sm">QA Managers</p>
          <p className="text-2xl font-bold text-blue-300">{users.filter(u => u.role === 'QA_MANAGER').length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-600 bg-slate-800/50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Role</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Last Active</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-100 font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{user.department}</td>
                  <td className="px-6 py-4 text-sm">
                    {editingUserId === user.id ? (
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value as any)}
                        className="bg-slate-600 text-slate-100 px-2 py-1 rounded text-xs"
                      >
                        <option value="STAFF">STAFF</option>
                        <option value="QA_MANAGER">QA_MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    ) : (
                      <span className={clsx('inline-block px-3 py-1 rounded-full text-xs font-semibold border', getRoleColor(user.role))}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={clsx('flex items-center space-x-1', getStatusBadge(user.status).color)}>
                      <span>{getStatusBadge(user.status).icon}</span>
                      <span>{getStatusBadge(user.status).text}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">{user.lastActive}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {editingUserId === user.id ? (
                      <>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold transition-colors"
                        >
                          ✓ Done
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-xs font-semibold transition-colors"
                        >
                          ✕ Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setEditingUserId(user.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={() => setShowConfirmModal({ userId: user.id, action: user.status === 'banned' ? 'unban' : 'ban' })}
                          className={clsx(
                            'px-3 py-1 rounded text-xs font-semibold transition-colors',
                            user.status === 'banned'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          )}
                        >
                          {user.status === 'banned' ? 'Unban' : 'Ban'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">
              Confirm {showConfirmModal.action === 'ban' ? 'Ban' : 'Unban'}
            </h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to {showConfirmModal.action} this user?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() =>
                  showConfirmModal.action === 'ban'
                    ? banUser(showConfirmModal.userId)
                    : unbanUser(showConfirmModal.userId)
                }
                className={clsx(
                  'flex-1 py-2 rounded font-bold transition-colors',
                  showConfirmModal.action === 'ban'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                )}
              >
                Yes, {showConfirmModal.action}
              </button>
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
