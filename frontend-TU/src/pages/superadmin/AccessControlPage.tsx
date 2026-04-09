// ===================================================
// AccessControlPage.tsx - Trang kiểm soát truy cập
// Quản lý login sessions và force logout
// ===================================================

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

interface LoginSession {
  sessionId: string;
  userId: string;
  userName: string;
  email: string;
  device: string;
  ipAddress: string;
  location: string;
  loginTime: string;
  lastActivity: string;
  status: 'active' | 'idle' | 'suspicious';
}

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  action: 'login' | 'logout' | 'create_idea' | 'vote' | 'admin_action' | 'failed_auth';
  ipAddress: string;
  device: string;
  timestamp: string;
  status: 'success' | 'failed';
}

const mockSessions: LoginSession[] = [
  {
    sessionId: 'sess_001',
    userId: '1',
    userName: 'John Developer',
    email: 'john@example.com',
    device: 'Windows 10 - Chrome',
    ipAddress: '192.168.1.100',
    location: 'Hanoi, Vietnam',
    loginTime: '2024-04-08 08:30:00',
    lastActivity: '2024-04-08 11:45:30',
    status: 'active',
  },
  {
    sessionId: 'sess_002',
    userId: '2',
    userName: 'Sarah Quality',
    email: 'sarah@example.com',
    device: 'MacOS - Safari',
    ipAddress: '192.168.1.101',
    location: 'Ho Chi Minh, Vietnam',
    loginTime: '2024-04-08 09:15:00',
    lastActivity: '2024-04-08 11:30:00',
    status: 'idle',
  },
  {
    sessionId: 'sess_003',
    userId: '4',
    userName: 'Alex Admin',
    email: 'alex@example.com',
    device: 'Linux - Firefox',
    ipAddress: '203.162.45.20',
    location: 'Da Nang, Vietnam',
    loginTime: '2024-04-08 10:00:00',
    lastActivity: '2024-04-08 11:50:00',
    status: 'active',
  },
  {
    sessionId: 'sess_004',
    userId: 'unknown',
    userName: 'Suspicious User',
    email: 'unknown@darkweb.com',
    device: 'Unknown Device',
    ipAddress: '10.0.0.50',
    location: 'Unknown Location',
    loginTime: '2024-04-08 11:55:00',
    lastActivity: '2024-04-08 11:58:00',
    status: 'suspicious',
  },
];

const mockAccessLogs: AccessLog[] = [
  {
    id: '1',
    userId: '1',
    userName: 'John Developer',
    action: 'login',
    ipAddress: '192.168.1.100',
    device: 'Windows 10 - Chrome',
    timestamp: '2024-04-08 08:30:00',
    status: 'success',
  },
  {
    id: '2',
    userId: '2',
    userName: 'Sarah Quality',
    action: 'create_idea',
    ipAddress: '192.168.1.101',
    device: 'MacOS - Safari',
    timestamp: '2024-04-08 11:25:00',
    status: 'success',
  },
  {
    id: '3',
    userId: '5',
    userName: 'Unknown User',
    action: 'failed_auth',
    ipAddress: '192.168.1.105',
    device: 'Unknown Device',
    timestamp: '2024-04-08 11:40:00',
    status: 'failed',
  },
  {
    id: '4',
    userId: '1',
    userName: 'John Developer',
    action: 'vote',
    ipAddress: '192.168.1.100',
    device: 'Windows 10 - Chrome',
    timestamp: '2024-04-08 11:45:00',
    status: 'success',
  },
  {
    id: '5',
    userId: '4',
    userName: 'Alex Admin',
    action: 'admin_action',
    ipAddress: '203.162.45.20',
    device: 'Linux - Firefox',
    timestamp: '2024-04-08 11:50:00',
    status: 'success',
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return { icon: '🟢', text: 'Active', color: 'text-green-400' };
    case 'idle':
      return { icon: '🟡', text: 'Idle', color: 'text-yellow-400' };
    case 'suspicious':
      return { icon: '🔴', text: 'Suspicious', color: 'text-red-400' };
    default:
      return { icon: '❓', text: 'Unknown', color: 'text-slate-400' };
  }
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'login':
      return '🟢';
    case 'logout':
      return '🔵';
    case 'create_idea':
      return '💡';
    case 'vote':
      return '👍';
    case 'admin_action':
      return '⚙️';
    case 'failed_auth':
      return '❌';
    default:
      return '❓';
  }
};

export const AccessControlPage: React.FC = () => {
  const [sessions, setSessions] = useState<LoginSession[]>(mockSessions);
  const [logs, setLogs] = useState<AccessLog[]>(mockAccessLogs);
  const [filterAction, setFilterAction] = useState<'all' | string>('all');
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);

  useEffect(() => {
    console.log('[TU-SUPERADMIN]: Đang rà soát các luồng truy cập trái phép!');
    console.log('[TU-SUPERADMIN]: 🔐 Access control check initiated at', new Date().toLocaleTimeString());
  }, []);

  const forceLogout = (sessionId: string) => {
    const sessionToRemove = sessions.find(s => s.sessionId === sessionId);
    if (sessionToRemove) {
      setSessions(sessions.filter(s => s.sessionId !== sessionId));
      setLogs([...logs, {
        id: (logs.length + 1).toString(),
        userId: sessionToRemove.userId,
        userName: sessionToRemove.userName,
        action: 'logout',
        ipAddress: sessionToRemove.ipAddress,
        device: sessionToRemove.device,
        timestamp: new Date().toLocaleString(),
        status: 'success',
      }]);
      console.log(`[TU-SUPERADMIN]: 🚪 Force logout executed for ${sessionToRemove.userName}`);
    }
    setShowConfirmModal(null);
  };

  const filteredLogs = filterAction === 'all' ? logs : logs.filter(log => log.action === filterAction);
  const activeSessions = sessions.length;
  const failedAttempts = logs.filter(log => log.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span>🔐</span>
          <span>Access Control</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">Monitor and manage active sessions and access logs</p>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-600/20 border border-green-600/50 rounded-lg p-4">
          <p className="text-green-300 text-sm">Active Sessions</p>
          <p className="text-2xl font-bold text-green-300">{activeSessions}</p>
        </div>
        <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-4">
          <p className="text-yellow-300 text-sm">Total Access Logs</p>
          <p className="text-2xl font-bold text-yellow-300">{logs.length}</p>
        </div>
        <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
          <p className="text-red-300 text-sm">Failed Auth Attempts</p>
          <p className="text-2xl font-bold text-red-300">{failedAttempts}</p>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <span>👥</span>
          <span>Active Sessions ({sessions.length})</span>
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session) => {
            const badge = getStatusBadge(session.status);
            return (
              <div key={session.sessionId} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{session.userName}</h4>
                    <p className="text-sm text-slate-400">{session.email}</p>
                  </div>
                  <span className={clsx('flex items-center space-x-1', badge.color)}>
                    <span>{badge.icon}</span>
                    <span>{badge.text}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-slate-300">
                  <div>📱 Device: {session.device}</div>
                  <div>🌐 IP: {session.ipAddress}</div>
                  <div>📍 Location: {session.location}</div>
                  <div>⏰ Logged in: {session.loginTime}</div>
                </div>
                <button
                  onClick={() => setShowConfirmModal(session.sessionId)}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors"
                >
                  🚪 Force Logout
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Access Audit Trail */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>📋</span>
            <span>Access Audit Trail</span>
          </h3>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-700 text-slate-100 px-4 py-2 rounded text-sm"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="create_idea">Create Idea</option>
            <option value="vote">Vote</option>
            <option value="admin_action">Admin Action</option>
            <option value="failed_auth">Failed Auth</option>
          </select>
        </div>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-800/50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-200">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-200">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-200">IP Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-200">Device</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-200">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-100">{log.userName}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center space-x-1">
                        <span>{getActionIcon(log.action)}</span>
                        <span className="text-slate-300">{log.action.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{log.ipAddress}</td>
                    <td className="px-4 py-3 text-slate-400">{log.device}</td>
                    <td className="px-4 py-3 text-slate-400">{log.timestamp}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-semibold', log.status === 'success' ? 'text-green-400' : 'text-red-400')}>
                        {log.status === 'success' ? '✓ Success' : '✕ Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Force Logout?</h3>
            <p className="text-slate-300 mb-6">
              This will immediately terminate the user's session and force them to login again.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => forceLogout(showConfirmModal)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors"
              >
                Yes, logout
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

export default AccessControlPage;
