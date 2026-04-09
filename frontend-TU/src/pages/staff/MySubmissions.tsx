// ===================================================
// MY SUBMISSIONS - Staff view their submitted ideas
// ===================================================

import React, { useState, useEffect } from 'react';
import { ideasAPI } from '../../api/tu-api-endpoints';
import type { Idea } from '../../api/tu-api-endpoints';
import {
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MySubmissions: React.FC = () => {
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');

  // ===================================================
  // Load user's ideas
  // ===================================================
  useEffect(() => {
    const loadIdeas = async () => {
      try {
        console.log('[TU-MY-SUBMISSIONS] 📥 Loading my submissions...');
        const response = await ideasAPI.list();
        
        if (response.data) {
          // Get current user ID from localStorage
          const userInfo = localStorage.getItem('tu_user_info');
          if (userInfo) {
            const user = JSON.parse(userInfo);
            // Filter ideas by current user
            const myIdeas = response.data.filter((idea: Idea) => idea.author_id === user.id || idea.author_name === user.name);
            setIdeas(myIdeas);
            console.log('[TU-MY-SUBMISSIONS] ✅ Loaded:', myIdeas.length, 'submissions');
          }
        }
      } catch (error) {
        console.error('[TU-MY-SUBMISSIONS] ❌ Failed to load:', error);
      } finally {
        setLoading(false);
      }
    };

    loadIdeas();
  }, []);

  // ===================================================
  // Filter ideas
  // ===================================================
  useEffect(() => {
    if (statusFilter === 'All') {
      setFilteredIdeas(ideas);
    } else {
      setFilteredIdeas(ideas.filter(idea => idea.status === statusFilter));
    }
  }, [ideas, statusFilter]);

  // ===================================================
  // Handle delete
  // ===================================================
  const handleDelete = async (ideaId: string) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa ý tưởng này không?');
    if (!confirmed) return;

    try {
      console.log(`[TU-MY-SUBMISSIONS] 🗑️ Deleting idea ${ideaId}...`);
      await ideasAPI.delete(ideaId);
      
      setIdeas(ideas.filter(idea => idea._id !== ideaId));
      alert('✅ Ý tưởng đã bị xóa!');
      console.log('[TU-MY-SUBMISSIONS] ✅ Deleted successfully');
    } catch (error) {
      console.error('[TU-MY-SUBMISSIONS] ❌ Delete failed:', error);
      alert('❌ Xóa thất bại!');
    }
  };

  // ===================================================
  // Status Badge
  // ===================================================
  const StatusBadge = ({ status }: { status: 'Pending' | 'Approved' | 'Rejected' }) => {
    const styles = {
      Pending: 'bg-yellow-900/30 text-yellow-400',
      Approved: 'bg-green-900/30 text-green-400',
      Rejected: 'bg-red-900/30 text-red-400',
    };

    const icons = {
      Pending: <Clock size={16} />,
      Approved: <CheckCircle size={16} />,
      Rejected: <XCircle size={16} />,
    };

    const labels = {
      Pending: '⏳ Đang chờ duyệt',
      Approved: '✅ Đã phê duyệt',
      Rejected: '❌ Bị từ chối',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    );
  };

  console.log('[TU-MY-SUBMISSIONS] 📊 Component mounted');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white">Đang tải ý tưởng của bạn...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">📝 Ý tưởng của tôi</h1>
        <p className="text-slate-400">
          Xem tất cả ý tưởng bạn đã nộp và trạng thái của chúng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-2">Tổng cộng</p>
          <p className="text-3xl font-bold text-white">{ideas.length}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-2">⏳ Chờ duyệt</p>
          <p className="text-3xl font-bold text-yellow-400">
            {ideas.filter(i => i.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-2">✅ Phê duyệt</p>
          <p className="text-3xl font-bold text-green-400">
            {ideas.filter(i => i.status === 'Approved').length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-2">❌ Từ chối</p>
          <p className="text-3xl font-bold text-red-400">
            {ideas.filter(i => i.status === 'Rejected').length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={18} className="text-slate-400" />
        <div className="flex gap-2 flex-wrap">
          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === status
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {status === 'All' ? 'Tất cả' : status === 'Pending' ? '⏳ Chờ' : status === 'Approved' ? '✅ Duyệt' : '❌ Từ chối'}
            </button>
          ))}
        </div>
      </div>

      {/* Ideas List */}
      <div className="space-y-4">
        {filteredIdeas.length === 0 ? (
          <div className="text-center py-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-lg">Không có ý tưởng nào</p>
          </div>
        ) : (
          filteredIdeas.map((idea) => (
            <div
              key={idea._id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2">{idea.title}</h3>
                  <p className="text-slate-400 text-sm line-clamp-2">{idea.description}</p>
                </div>
                <StatusBadge status={idea.status} />
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4 pb-4 border-b border-slate-700">
                <div>
                  <p className="text-slate-500">Phòng ban</p>
                  <p className="text-slate-300 font-medium">{idea.department}</p>
                </div>
                <div>
                  <p className="text-slate-500">Danh mục</p>
                  <p className="text-slate-300 font-medium">{idea.category}</p>
                </div>
                <div>
                  <p className="text-slate-500">Ngày nộp</p>
                  <p className="text-slate-300 font-medium">
                    {new Date(idea.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Lượt yêu thích</p>
                  <p className="text-slate-300 font-medium">👍 {idea.votes_count}</p>
                </div>
              </div>

              {/* Rejection Reason */}
              {idea.status === 'Rejected' && idea.rejection_reason && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm font-semibold mb-1">Lý do từ chối:</p>
                  <p className="text-red-300 text-sm">{idea.rejection_reason}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/ideas/${idea._id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                >
                  <Eye size={16} />
                  Xem chi tiết
                </button>
                {idea.status === 'Pending' && (
                  <button
                    onClick={() => handleDelete(idea._id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors font-medium"
                  >
                    <Trash2 size={16} />
                    Xóa
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submit New Idea Button */}
      <div className="sticky bottom-6 flex justify-center">
        <button
          onClick={() => navigate('/staff/submit')}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          + Nộp ý tưởng mới
        </button>
      </div>
    </div>
  );
};
