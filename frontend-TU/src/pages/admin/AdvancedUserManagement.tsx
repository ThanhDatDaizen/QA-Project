// ===================================================
// AdvancedUserManagement.tsx - Absolute User Control Panel
// Role Assignment, Ban System, Nuclear Delete ☢️
// ===================================================

import React, { useState } from 'react';
import clsx from 'clsx';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'User' | 'QA_Manager' | 'Admin' | 'SuperAdmin';
  status: 'active' | 'banned' | 'suspended';
  joinDate: string;
  lastActive: string;
  bannedUntil?: string;
}

type BanDuration = '1h' | '24h' | '7d' | 'permanent';

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Developer',
    email: 'john@icms.local',
    role: 'User',
    status: 'active',
    joinDate: '2026-01-15',
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    name: 'Sarah QA Manager',
    email: 'sarah@icms.local',
    role: 'QA_Manager',
    status: 'active',
    joinDate: '2026-02-20',
    lastActive: '30 mins ago',
  },
  {
    id: '3',
    name: 'Spam Bot User',
    email: 'spambot@icms.local',
    role: 'User',
    status: 'banned',
    joinDate: '2026-03-01',
    lastActive: 'Never',
    bannedUntil: '2026-04-15 (Permanent)',
  },
  {
    id: '4',
    name: 'Alex Admin',
    email: 'alex@icms.local',
    role: 'Admin',
    status: 'active',
    joinDate: '2025-12-10',
    lastActive: '1 hour ago',
  },
];

type RoleChangeAction = 'promote' | 'demote' | 'setQA';

export const AdvancedUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const applyRoleChange = (userId: string, action: RoleChangeAction) => {
    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        let newRole = user.role;
        switch (action) {
          case 'promote':
            if (user.role === 'User') newRole = 'QA_Manager';
            else if (user.role === 'QA_Manager') newRole = 'Admin';
            break;
          case 'demote':
            if (user.role === 'Admin') newRole = 'QA_Manager';
            else if (user.role === 'QA_Manager') newRole = 'User';
            break;
          case 'setQA':
            newRole = 'QA_Manager';
            break;
        }

        console.log(
          `%c[TU-SUPERADMIN] 👑 Changed role for ${user.name} from ${user.role} → ${newRole}`,
          'color: #ffd700; font-weight: bold;'
        );

        return { ...user, role: newRole };
      }
      return user;
    });

    setUsers(updatedUsers);
    alert(`✅ Role updated successfully! ${updatedUsers.find(u => u.id === userId)?.name} is now ${updatedUsers.find(u => u.id === userId)?.role}`);
  };

  const applyBan = (userId: string, duration: BanDuration) => {
    const durationText = {
      '1h': '1 Hour',
      '24h': '24 Hours',
      '7d': '7 Days',
      permanent: 'Permanent',
    };

    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        console.log(
          `%c[TU-SUPERADMIN] 🔴 ${durationText[duration]} BAN applied to ${user.name}!`,
          'color: #ff0000; font-weight: bold;'
        );

        return {
          ...user,
          status: 'banned' as const,
          bannedUntil: `${durationText[duration]} Ban Applied`,
        };
      }
      return user;
    });

    setUsers(updatedUsers);
    alert(
      `⚠️ ${updatedUsers.find(u => u.id === userId)?.name} has been banned for ${durationText[duration]}`
    );
  };

  const deleteUserPermanently = (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    console.log(
      `%c[TU-SUPERADMIN] ☢️ NUCLEAR DELETE executed on ${userToDelete?.name}! Account erased from existence!`,
      'color: #ff0000; font-weight: bold; font-size: 14px;'
    );

    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    setConfirmDelete(null);
    alert(
      `💥 ${userToDelete?.name} has been permanently deleted from the system!`
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'QA_Manager':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'SuperAdmin':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'banned':
        return '🚫';
      case 'suspended':
        return '⏸️';
      default:
        return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          👥 Advanced User Management
        </h2>
        <p className="text-slate-400">
          Total Users: <span className="text-white font-bold">{users.length}</span> |
          Active: <span className="text-green-400 font-bold">
            {users.filter((u) => u.status === 'active').length}
          </span>{' '}
          | Banned: <span className="text-red-400 font-bold">
            {users.filter((u) => u.status === 'banned').length}
          </span>
        </p>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50 border-b border-slate-700">
              <tr>
                <th className="p-4 text-left text-white font-semibold">User</th>
                <th className="p-4 text-left text-white font-semibold">Role</th>
                <th className="p-4 text-left text-white font-semibold">Status</th>
                <th className="p-4 text-left text-white font-semibold">Joined</th>
                <th className="p-4 text-left text-white font-semibold">Last Active</th>
                <th className="p-4 text-left text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-700 hover:bg-slate-700/30 transition"
                >
                  <td className="p-4">
                    <div>
                      <div className="font-semibold text-white">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={clsx(
                        'px-3 py-1 rounded border text-xs font-semibold',
                        getRoleColor(user.role)
                      )}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span>{getStatusIcon(user.status)}</span>
                      <span className="capitalize text-white">{user.status}</span>
                    </div>
                    {user.bannedUntil && (
                      <div className="text-xs text-red-400 mt-1">
                        until {user.bannedUntil}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-slate-300">{user.joinDate}</td>
                  <td className="p-4 text-slate-300">{user.lastActive}</td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-semibold transition"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected User Management Panel */}
      {selectedUser && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">
                ⚙️ Manage User: {selectedUser.name}
              </h3>
              <p className="text-slate-400 mt-1">
                {selectedUser.email} | ID: {selectedUser.id}
              </p>
            </div>
            <button
              onClick={() => setSelectedUser(null)}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role Management */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 className="text-lg font-bold text-white mb-4">👑 Role Assignment</h4>
              <div className="space-y-2">
                <button
                  onClick={() => applyRoleChange(selectedUser.id, 'promote')}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition"
                >
                  ⬆️ Promote User
                </button>
                <button
                  onClick={() => applyRoleChange(selectedUser.id, 'setQA')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
                >
                  🔵 Set as QA Manager
                </button>
                <button
                  onClick={() => applyRoleChange(selectedUser.id, 'demote')}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-semibold transition"
                >
                  ⬇️ Demote User
                </button>
              </div>
            </div>

            {/* Ban System */}
            <div className="bg-slate-900/50 border border-red-700/30 rounded-lg p-4">
              <h4 className="text-lg font-bold text-white mb-4">🔴 Ban System</h4>
              <p className="text-xs text-slate-400 mb-3">
                Current Status:{' '}
                <span className="text-white">
                  {selectedUser.status === 'banned' ? 'BANNED' : 'ACTIVE'}
                </span>
              </p>
              <div className="space-y-2">
                {(
                  [
                    { duration: '1h', label: '⏱️ Ban 1 Hour' },
                    { duration: '24h', label: '📅 Ban 24 Hours' },
                    { duration: '7d', label: '📆 Ban 7 Days' },
                    { duration: 'permanent', label: '🚫 Ban Permanently' },
                  ] as const
                ).map(({ duration, label }) => (
                  <button
                    key={duration}
                    onClick={() => applyBan(selectedUser.id, duration)}
                    className={clsx(
                      'w-full px-4 py-2 rounded font-semibold transition',
                      duration === 'permanent'
                        ? 'bg-red-700 hover:bg-red-800 text-white'
                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nuclear Delete */}
            <div className="bg-slate-900/50 border border-red-500/50 rounded-lg p-4">
              <h4 className="text-lg font-bold text-red-400 mb-4">☢️ Nuclear Delete</h4>
              <p className="text-xs text-slate-400 mb-4">
                Permanently erase this account and all data. This action cannot be undone!
              </p>
              {confirmDelete !== selectedUser.id ? (
                <button
                  onClick={() => setConfirmDelete(selectedUser.id)}
                  className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition animate-pulse"
                >
                  🗑️ Delete Account
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="bg-red-500/20 border border-red-500 rounded p-3">
                    <p className="text-red-300 font-bold">
                      ⚠️ Are you absolutely sure?
                    </p>
                    <p className="text-xs text-red-300 mt-1">
                      This will permanently delete {selectedUser.name}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteUserPermanently(selectedUser.id)}
                    className="w-full px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-bold transition"
                  >
                    💥 Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedUserManagement;
