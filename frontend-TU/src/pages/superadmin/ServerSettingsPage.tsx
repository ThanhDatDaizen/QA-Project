// ===================================================
// SERVER SETTINGS - SuperAdmin environment & maintenance
// ===================================================

import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';

interface ServerSettings {
  appName: string;
  environment: string;
  version: string;
  maintenance: boolean;
  maintenanceMessage: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  apiTimeout: number;
}

export const ServerSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<ServerSettings>({
    appName: 'ICMS',
    environment: 'production',
    version: '1.0.0',
    maintenance: false,
    maintenanceMessage: '',
    maxFileSize: 100,
    allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
    apiTimeout: 30,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('[TU-SETTINGS] 📥 Loading server settings...');
    // Load from localStorage or API
    const saved = localStorage.getItem('serverSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
      console.log('[TU-SETTINGS] ✅ Loaded from storage');
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('[TU-SETTINGS] 💾 Saving settings...', settings);
      // Save to localStorage
      localStorage.setItem('serverSettings', JSON.stringify(settings));
      alert('✅ Cài đặt đã lưu!');
      console.log('[TU-SETTINGS] ✅ Saved');
    } catch (error) {
      console.error('[TU-SETTINGS] ❌ Save failed:', error);
      alert('❌ Lưu thất bại!');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm('Bạn chắc chắn muốn khôi phục cài đặt mặc định?');
    if (confirmed) {
      setSettings({
        appName: 'ICMS',
        environment: 'production',
        version: '1.0.0',
        maintenance: false,
        maintenanceMessage: '',
        maxFileSize: 100,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
        apiTimeout: 30,
      });
      alert('✅ Đã khôi phục!');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
          <Settings size={32} />
          Cài đặt máy chủ
        </h1>
        <p className="text-slate-400">Quản lý cấu hình hệ thống</p>
      </div>

      {/* General Settings */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-white">Thông tin chung</h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Tên ứng dụng</label>
          <input
            type="text"
            value={settings.appName}
            onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Environment</label>
            <select
              value={settings.environment}
              onChange={(e) => setSettings({ ...settings, environment: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
            >
              <option>development</option>
              <option>staging</option>
              <option>production</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Phiên bản</label>
            <input
              type="text"
              value={settings.version}
              onChange={(e) => setSettings({ ...settings, version: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-white">Bảo trì</h2>

        <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg">
          <input
            type="checkbox"
            checked={settings.maintenance}
            onChange={(e) => setSettings({ ...settings, maintenance: e.target.checked })}
            className="w-4 h-4"
          />
          <label className="text-slate-300">Bật chế độ bảo trì</label>
        </div>

        <textarea
          placeholder="Tin nhắn bảo trì (hiển thị khi bật chế độ bảo trì)"
          value={settings.maintenanceMessage}
          onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
          className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none"
          rows={3}
          disabled={!settings.maintenance}
        />
      </div>

      {/* File Settings */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-white">Tệp tin</h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Kích thước tối đa (MB)</label>
          <input
            type="number"
            value={settings.maxFileSize}
            onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Loại tệp cho phép</label>
          <input
            type="text"
            value={settings.allowedFileTypes.join(', ')}
            onChange={(e) =>
              setSettings({
                ...settings,
                allowedFileTypes: e.target.value.split(',').map((t) => t.trim()),
              })
            }
            placeholder="pdf, doc, docx separated by commas"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* API Settings */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-white">API</h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">API Timeout (giây)</label>
          <input
            type="number"
            value={settings.apiTimeout}
            onChange={(e) => setSettings({ ...settings, apiTimeout: parseInt(e.target.value) })}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          <Save size={20} />
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
        <button
          onClick={handleReset}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw size={20} />
          Khôi phục mặc định
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 text-blue-200 text-sm">
        ℹ️ Các cài đặt này sẽ ảnh hưởng đến toàn bộ hệ thống. Thay đổi sẽ lưu vào localStorage.
      </div>
    </div>
  );
};
