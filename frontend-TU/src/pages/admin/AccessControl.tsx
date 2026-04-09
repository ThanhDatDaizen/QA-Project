// ===================================================
// AccessControl.tsx - Access Audit Trail & Force Logout
// Monitor Who's Doing What, When, Where 🔐
// ===================================================

import React, { useState } from 'react';
import clsx from 'clsx';

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'login' | 'logout' | 'create_idea' | 'vote' | 'admin_action' | 'failed_auth';
  ipAddress: string;
  device: string;
  timestamp: string;
  status: 'success' | 'failed';
  details: string;
}

interface ActiveSession {
  sessionId: string;
  userId: string;
  userName: string;
  email: string;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  device: string;
  location: string;
}

const mockAccessLogs: AccessLog[] = [
  {
    id: '1',
    userId: '1',
    userName: 'John Developer',
    userEmail: 'john@icms.local',
    action: 'login',
    ipAddress: '192.168.1.100',
    device: 'Chrome on Windows',
    timestamp: '2026-04-08 14:32:45',
    status: 'success',
    details: 'Successful login from local network',
  },
  {
    id: '2',
    userId: '2',
    userName: 'Sarah QA Manager',
    userEmail: 'sarah@icms.local',
    action: 'create_idea',
    ipAddress: '192.168.1.101',
    device: 'Safari on MacOS',
    timestamp: '2026-04-08 14:28:12',
    status: 'success',
    details: 'Created new idea: "Performance Optimization"',
  },
  {
    id: '3',
    userId: 'unknown',
    userName: 'Unknown User',
    userEmail: 'unknown@example.com',
    action: 'failed_auth',
    ipAddress: '203.0.113.45',
    device: 'Unknown',
    timestamp: '2026-04-08 14:15:33',
    status: 'failed',
    details: 'Failed login attempt with invalid credentials',
  },
  {
    id: '4',
    userId: '4',
    userName: 'Alex Admin',
    userEmail: 'alex@icms.local',
    action: 'admin_action',
    ipAddress: '192.168.1.102',
    device: 'Edge on Windows',
    timestamp: '2026-04-08 14:05:22',
    status: 'success',
    details: 'Changed user role: john@icms.local → QA_Manager',
  },
  {
    id: '5',
    userId: '1',
    userName: 'John Developer',
    userEmail: 'john@icms.local',
    action: 'vote',
    ipAddress: '192.168.1.100',
    device: 'Chrome on Windows',
    timestamp: '2026-04-08 13:45:00',
    status: 'success',
    details: 'Upvoted idea #342',
  },
];

const mockActiveSessions: ActiveSession[] = [
  {
    sessionId: 'sess_001',
    userId: '1',
    userName: 'John Developer',
    email: 'john@icms.local',
    loginTime: '2 hours ago',
    lastActivity: '2 minutes ago',
    ipAddress: '192.168.1.100',
    device: 'Chrome on Windows',
    location: 'Local Network',
  },
  {
    sessionId: 'sess_002',
    userId: '2',
    userName: 'Sarah QA Manager',
    email: 'sarah@icms.local',
    loginTime: '4 hours ago',
    lastActivity: '5 minutes ago',
    ipAddress: '192.168.1.101',
    device: 'Safari on MacOS',
    location: 'Local Network',
  },
  {
    sessionId: 'sess_003',
    userId: '4',
    userName: 'Alex Admin',
    email: 'alex@icms.local',
    loginTime: '1 hour ago',
    lastActivity: '1 minute ago',
    ipAddress: '192.168.1.102',
    device: 'Edge on Windows',
    location: 'Local Network',
  },
];

export const AccessControl: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(mockAccessLogs);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(mockActiveSessions);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [confirmForceLogout, setConfirmForceLogout] = useState<string | null>(null);

  const forceLogoutSession = (sessionId: string) => {
    const session = activeSessions.find((s) => s.sessionId === sessionId);
    console.log(
      `%c[TU-SUPERADMIN] 🔴 Force logout executed for ${session?.userName}!`,
      'color: #ff0000; font-weight: bold;'
    );

    const updatedSessions = activeSessions.filter((s) => s.sessionId !== sessionId);
    setActiveSessions(updatedSessions);

    // Add to access logs
    if (session) {
      const newLog: AccessLog = {
        id: String(accessLogs.length + 1),
        userId: session.userId,
        userName: session.userName,
        userEmail: session.email,
        action: 'logout',
        ipAddress: session.ipAddress,
        device: session.device,
        timestamp: new Date().toLocaleString(),
        status: 'success',
        details: 'Force logout by SuperAdmin',
      };
      setAccessLogs([newLog, ...accessLogs]);
    }

    setConfirmForceLogout(null);
    alert(
      `✅ ${session?.userName} has been forcefully logged out from all devices!`
    );
  };

  const filteredLogs =
    filterAction === 'all'
      ? accessLogs
      : accessLogs.filter((log) => log.action === filterAction);

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
        return '•';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'success'
      ? 'bg-green-500/10 text-green-300 border-green-500/30'
      : 'bg-red-500/10 text-red-300 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Active Sessions */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          📱 Active Sessions ({activeSessions.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activeSessions.map((session) => (
            <div
              key={session.sessionId}
              className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {session.userName}
                  </h4>
                  <p className="text-sm text-slate-400">{session.email}</p>
                </div>
                <span className="text-2xl">👤</span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Device:</span>
                  <span className="text-white">{session.device}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP Address:</span>
                  <span className="text-white font-mono">{session.ipAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-white">{session.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Logged in:</span>
                  <span className="text-white">{session.loginTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Activity:</span>
                  <span className="text-green-400">{session.lastActivity}</span>
                </div>
              </div>

              {confirmForceLogout !== session.sessionId ? (
                <button
                  onClick={() => setConfirmForceLogout(session.sessionId)}
                  className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 rounded font-semibold transition"
                >
                  🔓 Force Logout
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="bg-red-500/20 border border-red-500 rounded p-2">
                    <p className="text-red-300 text-sm font-bold">
                      ⚠️ Confirm Force Logout?
                    </p>
                  </div>
                  <button
                    onClick={() => forceLogoutSession(session.sessionId)}
                    className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
                  >
                    ✅ Yes, Force Logout
                  </button>
                  <button
                    onClick={() => setConfirmForceLogout(null)}
                    className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Access Audit Trail */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            🔍 Access Audit Trail
          </h2>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded"
          >
            <option value="all">All Actions</option>
            <option value="login">Logins</option>
            <option value="logout">Logouts</option>
            <option value="create_idea">Create Idea</option>
            <option value="vote">Votes</option>
            <option value="admin_action">Admin Actions</option>
            <option value="failed_auth">Failed Auth</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No access logs found for selected filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={clsx(
                  'border rounded-lg p-4 transition',
                  getStatusColor(log.status)
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-1">{getActionIcon(log.action)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                      <span className="font-bold text-white">{log.userName}</span>
                      <span className="text-xs opacity-75">
                        {log.userEmail}
                      </span>
                      <span className="px-2 py-1 bg-black/30 rounded text-xs font-semibold">
                        {log.action.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs opacity-75">{log.timestamp}</span>
                    </div>

                    <p className="text-sm mb-2">{log.details}</p>

                    <div className="flex flex-wrap gap-4 text-xs opacity-75">
                      <span>🌐 {log.ipAddress}</span>
                      <span>💻 {log.device}</span>
                      <span className={log.status === 'success' ? 'text-green-300' : 'text-red-300'}>
                        {log.status === 'success' ? '✅ Success' : '❌ Failed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-4xl mb-2">👤</div>
          <div className="text-sm text-slate-400">Total Active Sessions</div>
          <div className="text-3xl font-bold text-white mt-2">
            {activeSessions.length}
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-sm text-slate-400">Total Access Logs</div>
          <div className="text-3xl font-bold text-white mt-2">{accessLogs.length}</div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="text-4xl mb-2">❌</div>
          <div className="text-sm text-slate-400">Failed Auth Attempts</div>
          <div className="text-3xl font-bold text-red-400 mt-2">
            {accessLogs.filter((log) => log.status === 'failed').length}
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-3">🔒 Security Status</h3>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>✅ All active sessions are from authorized locations</li>
          <li>✅ No suspicious login patterns detected</li>
          <li>⚠️ Consider reviewing {accessLogs.filter((log) => log.status === 'failed').length} failed auth attempts</li>
          <li>✅ Admin audit trail is up to date</li>
        </ul>
      </div>
    </div>
  );
};

export default AccessControl;
