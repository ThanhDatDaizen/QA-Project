// ===================================================
// SystemMonitor.tsx - Real-time System Health Dashboard
// Displays CPU, RAM, Network Traffic using Recharts
// ===================================================

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';

interface SystemMetric {
  time: string;
  cpu: number;
  ram: number;
  network: number;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  avgCpu: number;
  avgRam: number;
  totalTraffic: number;
}

export const SystemMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [health, setHealth] = useState<HealthStatus>({
    status: 'healthy',
    uptime: '45 days 12h 34m',
    avgCpu: 0,
    avgRam: 0,
    totalTraffic: 0,
  });

  // 📊 Generate mock system data
  useEffect(() => {
    console.log(
      '%c[TU-OS] 💓 Kiểm tra nhịp tim hệ thống... Current FPS: 60',
      'color: #00ff00; font-weight: bold;'
    );

    // Simulate real-time metrics
    const generateMetrics = () => {
      const baseTime = new Date();
      const newMetrics: SystemMetric[] = [];

      for (let i = -30; i <= 0; i++) {
        const time = new Date(baseTime.getTime() + i * 60000);
        newMetrics.push({
          time: time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          cpu: Math.floor(Math.random() * 40 + 20), // 20-60%
          ram: Math.floor(Math.random() * 35 + 45), // 45-80%
          network: Math.floor(Math.random() * 500 + 100), // 100-600 Mbps
        });
      }

      setMetrics(newMetrics);

      // Calculate averages
      const avgCpu = Math.round(
        newMetrics.reduce((acc, m) => acc + m.cpu, 0) / newMetrics.length
      );
      const avgRam = Math.round(
        newMetrics.reduce((acc, m) => acc + m.ram, 0) / newMetrics.length
      );
      const totalTraffic = newMetrics.reduce((acc, m) => acc + m.network, 0);

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (avgCpu > 80 || avgRam > 90) status = 'critical';
      else if (avgCpu > 60 || avgRam > 75) status = 'warning';

      setHealth({
        status,
        uptime: '45 days 12h 34m',
        avgCpu,
        avgRam,
        totalTraffic,
      });

      console.log(
        `%c[TU-OS] 📊 Metrics Updated - CPU: ${avgCpu}%, RAM: ${avgRam}%, Network: ${totalTraffic}Mbps`,
        'color: #0ea5e9;'
      );
    };

    generateMetrics();

    // Update every 5 seconds
    const interval = setInterval(generateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'from-green-500 to-green-600 border-green-500/50';
      case 'warning':
        return 'from-yellow-500 to-yellow-600 border-yellow-500/50';
      case 'critical':
        return 'from-red-500 to-red-600 border-red-500/50';
      default:
        return 'from-blue-500 to-blue-600 border-blue-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '🚨';
      default:
        return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={clsx(
            'bg-gradient-to-br',
            getStatusColor(health.status),
            'p-6 rounded-lg border text-white'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold opacity-90">System Status</div>
              <div className="text-2xl font-bold mt-2 capitalize">
                {health.status}
              </div>
            </div>
            <div className="text-4xl">{getStatusIcon(health.status)}</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-500/50 p-6 rounded-lg text-white">
          <div className="text-sm font-semibold opacity-90">CPU Usage</div>
          <div className="text-3xl font-bold mt-2">{health.avgCpu}%</div>
          <div className="text-xs opacity-75 mt-2">Average: Last 30 min</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 border border-purple-500/50 p-6 rounded-lg text-white">
          <div className="text-sm font-semibold opacity-90">Memory Usage</div>
          <div className="text-3xl font-bold mt-2">{health.avgRam}%</div>
          <div className="text-xs opacity-75 mt-2">
            {Math.round((health.avgRam / 100) * 32)} GB / 32 GB
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 border border-orange-500/50 p-6 rounded-lg text-white">
          <div className="text-sm font-semibold opacity-90">Total Traffic</div>
          <div className="text-2xl font-bold mt-2">{health.totalTraffic}Mbps</div>
          <div className="text-xs opacity-75 mt-2">Network: Last 30 min</div>
        </div>
      </div>

      {/* System Uptime */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">System Uptime</h3>
            <p className="text-slate-400 mt-1">Tú's machine never sleeps 💪</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-green-400">{health.uptime}</div>
            <div className="text-sm text-slate-400 mt-2">🟢 Continuously Healthy</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & RAM Trend */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">📈 CPU & Memory (30 min)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="CPU %"
              />
              <Line
                type="monotone"
                dataKey="ram"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                name="RAM %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Network Traffic */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">🌐 Network Traffic (30 min)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                }}
              />
              <Area
                type="monotone"
                dataKey="network"
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.3}
                name="Traffic (Mbps)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">💡 Performance Insights</h3>
        <div className="space-y-2 text-slate-300">
          <div>
            ✅ CPU usage is optimal at {health.avgCpu}% - Good scaling performance
          </div>
          <div>✅ Memory efficiency: {health.avgRam}% - Room for spike handling</div>
          <div>
            ✅ Network throughput: {health.totalTraffic}Mbps - Excellent bandwidth
          </div>
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded">
            <span className="text-green-400 font-semibold">
              🚀 Your system is performing at peak efficiency!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
