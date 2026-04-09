// ===================================================
// SYSTEM LOGS - SuperAdmin view backend logs
// ===================================================

import React, { useState, useEffect } from 'react';
import { systemAPI } from '../../api/tu-api-endpoints';
import type { SystemLog } from '../../api/tu-api-endpoints';
import { AlertCircle, Info, Shield } from 'lucide-react';

type LogType = 'all' | 'request' | 'error' | 'auth';

export const SystemLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filterType, setFilterType] = useState<LogType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      console.log('[TU-LOGS] 📥 Loading system logs...');
      const response = await systemAPI.getLogs();
      if (response.data) {
        setLogs(Array.isArray(response.data) ? response.data : [response.data]);
        console.log('[TU-LOGS] ✅ Loaded:', response.data);
      }
    } catch (error) {
      console.error('[TU-LOGS] ❌ Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    // Map lowercase filter type to uppercase API type
    const upperFilterType = filterType.toUpperCase();
    return log.type === upperFilterType;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'auth':
        return <Shield className="text-yellow-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-900/20 border-red-700';
      case 'auth':
        return 'bg-yellow-900/20 border-yellow-700';
      default:
        return 'bg-blue-900/20 border-blue-700';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-4">Nhật ký hệ thống</h1>
        <p className="text-slate-400">Tổng: {filteredLogs.length} bản ghi</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'request', 'error', 'auth'] as LogType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === type
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Không có bản ghi
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-4 border ${getColor(log.type)} flex items-start gap-3`}
            >
              <div className="mt-1">{getIcon(log.type)}</div>
              <div className="flex-1">
                <p className="text-white font-medium">{log.message}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {new Date(log.timestamp).toLocaleString('vi-VN')}
                </p>
                {log.user_id && (
                  <p className="text-slate-500 text-xs mt-1">User: {log.user_id}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                log.type === 'ERROR'
                  ? 'bg-red-900 text-red-200'
                  : log.type === 'AUTH'
                  ? 'bg-yellow-900 text-yellow-200'
                  : 'bg-blue-900 text-blue-200'
              }`}>
                {log.type}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Auto Refresh Info */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-blue-200 text-sm">
        ℹ️ Tự động làm mới mỗi 5 giây
      </div>
    </div>
  );
};
