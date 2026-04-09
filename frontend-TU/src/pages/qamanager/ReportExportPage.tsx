// ===================================================
// REPORT EXPORT - QA Manager export report & data
// ===================================================

import React, { useState } from 'react';
import { exportAPI } from '../../api/tu-api-endpoints';
import { Download, FileJson, Archive } from 'lucide-react';

export const ReportExportPage: React.FC = () => {
  const [exportType, setExportType] = useState<'csv' | 'zip'>('csv');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Vui lòng chọn khoảng thời gian!');
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      console.log('[TU-EXPORT] 📤 Starting export...', {
        type: exportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      setProgress(30);

      if (exportType === 'csv') {
        const response = await exportAPI.toCSV({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        setProgress(70);

        // Create and trigger download
        const url = URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('[TU-EXPORT] ✅ CSV exported successfully');
      } else {
        const response = await exportAPI.toZIP({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        });

        setProgress(70);

        // Create and trigger download
        const url = URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `report-${dateRange.startDate}-to-${dateRange.endDate}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('[TU-EXPORT] ✅ ZIP exported successfully');
      }

      setProgress(100);
      alert('✅ Xuất dữ liệu thành công!');
    } catch (error) {
      console.error('[TU-EXPORT] ❌ Export failed:', error);
      alert('❌ Xuất thất bại!');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Xuất báo cáo</h1>
        <p className="text-slate-400">Tải xuống dữ liệu ý tưởng trong khoảng thời gian đã chọn</p>
      </div>

      {/* Export Type Selection */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-white">Định dạng xuất</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
            exportType === 'csv'
              ? 'bg-cyan-900/30 border-cyan-500'
              : 'bg-slate-900/50 border-slate-600 hover:border-slate-500'
          }`}>
            <input
              type="radio"
              value="csv"
              checked={exportType === 'csv'}
              onChange={(e) => setExportType(e.target.value as 'csv' | 'zip')}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <FileJson size={24} className="text-cyan-400" />
              <div>
                <p className="font-bold text-white">CSV</p>
                <p className="text-sm text-slate-400">Tệp văn bản có thể mở bằng Excel</p>
              </div>
            </div>
          </label>

          <label className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
            exportType === 'zip'
              ? 'bg-cyan-900/30 border-cyan-500'
              : 'bg-slate-900/50 border-slate-600 hover:border-slate-500'
          }`}>
            <input
              type="radio"
              value="zip"
              checked={exportType === 'zip'}
              onChange={(e) => setExportType(e.target.value as 'csv' | 'zip')}
              className="sr-only"
            />
            <div className="flex items-center gap-3">
              <Archive size={24} className="text-cyan-400" />
              <div>
                <p className="font-bold text-white">ZIP</p>
                <p className="text-sm text-slate-400">Tập hợp tất cả dữ liệu & tệp đính kèm</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-white">Khoảng thời gian</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Từ ngày</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Đến ngày</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>

        {dateRange.startDate && dateRange.endDate && (
          <p className="text-sm text-slate-400">
            📊 Khoảng thời gian: {new Date(dateRange.startDate).toLocaleDateString('vi-VN')} - {new Date(dateRange.endDate).toLocaleDateString('vi-VN')}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {loading && progress > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-medium">Đang xuất dữ liệu...</p>
            <p className="text-sm text-slate-400">{progress}%</p>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-lg font-bold text-lg transition-all transform hover:scale-105 disabled:scale-100"
      >
        <Download size={24} />
        {loading ? 'Đang xuất...' : `Xuất dưới dạng ${exportType.toUpperCase()}`}
      </button>

      {/* Info Card */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 space-y-2 text-blue-200 text-sm">
        <p>ℹ️ <strong>CSV:</strong> Chứa tất cả thông tin ý tưởng dưới dạng bảng</p>
        <p>ℹ️ <strong>ZIP:</strong> Chứa CSV + các tệp đính kèm gốc</p>
        <p>ℹ️ Khoảng thời gian mặc định là 30 ngày gần nhất</p>
      </div>
    </div>
  );
};
