// ===================================================
// IDEA REVIEW DETAIL - QA Manager Review & Approve/Reject
// ===================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Download,
  ArrowLeft,
  AlertCircle,
  User,
  Calendar,
  FolderOpen,
  MessageSquare,
} from 'lucide-react';
import { ideasAPI } from '../../api/tu-api-endpoints';
import type { Idea } from '../../api/tu-api-endpoints';

export const IdeaReviewDetail: React.FC = () => {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // ===================================================
  // Load idea details
  // ===================================================
  useEffect(() => {
    const loadIdea = async () => {
      if (!ideaId) return;
      try {
        console.log(`[TU-IDEA-REVIEW] 📥 Loading idea ${ideaId}...`);
        const response = await ideasAPI.getDetail(ideaId);
        if (response.data) {
          setIdea(response.data);
          console.log('[TU-IDEA-REVIEW] ✅ Idea loaded:', response.data);
        }
      } catch (error) {
        console.error('[TU-IDEA-REVIEW] ❌ Failed to load idea:', error);
        alert('Không thể tải ý tưởng, vui lòng thử lại!');
      } finally {
        setLoading(false);
      }
    };

    loadIdea();
  }, [ideaId]);

  // ===================================================
  // Handle Approve
  // ===================================================
  const handleApprove = async () => {
    if (!idea) return;
    
    const confirmed = window.confirm('Bạn có chắc muốn PHÊ DUYỆT ý tưởng này không?');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      console.log(`[TU-IDEA-REVIEW] ✅ Approving idea ${idea._id}...`);
      const response = await ideasAPI.approve(idea._id);
      
      console.log('[TU-IDEA-REVIEW] ✅ Idea approved:', response.data);
      alert('✅ Ý tưởng đã được phê duyệt!');
      navigate('/qamanager');
    } catch (error) {
      console.error('[TU-IDEA-REVIEW] ❌ Approve failed:', error);
      alert('❌ Phê duyệt thất bại, vui lòng thử lại!');
    } finally {
      setActionLoading(false);
    }
  };

  // ===================================================
  // Handle Reject
  // ===================================================
  const handleReject = async () => {
    if (!idea || !rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }

    const confirmed = window.confirm('Bạn có chắc muốn TỪ CHỐI ý tưởng này không?');
    if (!confirmed) return;

    setActionLoading(true);
    try {
      console.log(`[TU-IDEA-REVIEW] ❌ Rejecting idea ${idea._id}...`);
      const response = await ideasAPI.reject(idea._id, rejectionReason);
      
      console.log('[TU-IDEA-REVIEW] ✅ Idea rejected:', response.data);
      alert('✅ Ý tưởng đã bị từ chối!');
      navigate('/qamanager');
    } catch (error) {
      console.error('[TU-IDEA-REVIEW] ❌ Reject failed:', error);
      alert('❌ Từ chối thất bại, vui lòng thử lại!');
    } finally {
      setActionLoading(false);
    }
  };

  // ===================================================
  // Download attachment
  // ===================================================
  const handleDownloadAttachment = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  console.log('[TU-IDEA-REVIEW] 📊 Component mounted');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-white">Đang tải ý tưởng...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate('/qamanager')}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4"
        >
          <ArrowLeft size={20} />
          Quay lại
        </button>
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
          <p className="text-red-400">❌ Không tìm thấy ý tưởng này!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/qamanager')}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft size={20} />
          Quay lại
        </button>
        <div className={`px-4 py-2 rounded-full font-semibold ${
          idea.status === 'Pending'
            ? 'bg-yellow-900/30 text-yellow-400'
            : idea.status === 'Approved'
              ? 'bg-green-900/30 text-green-400'
              : 'bg-red-900/30 text-red-400'
        }`}>
          {idea.status === 'Pending' && '⏳ Đang chờ duyệt'}
          {idea.status === 'Approved' && '✅ Đã phê duyệt'}
          {idea.status === 'Rejected' && '❌ Bị từ chối'}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Section - Idea Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Basic Info */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6">
            <h1 className="text-3xl font-bold text-white mb-4">{idea.title}</h1>

            {/* Meta Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-slate-700">
              <div>
                <p className="text-slate-400 text-xs">Tác giả</p>
                <p className="text-white font-semibold flex items-center gap-2 mt-1">
                  <User size={14} />
                  {idea.author_name}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Phòng ban</p>
                <p className="text-white font-semibold flex items-center gap-2 mt-1">
                  <FolderOpen size={14} />
                  {idea.department}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Danh mục</p>
                <p className="text-white font-semibold">{idea.category}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Ngày nộp</p>
                <p className="text-white font-semibold flex items-center gap-2 mt-1">
                  <Calendar size={14} />
                  {new Date(idea.created_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-bold text-white mb-3">📝 Mô tả chi tiết</h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{idea.description}</p>
            </div>
          </div>

          {/* Expected Benefit */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6">
            <h2 className="text-lg font-bold text-white mb-3">💡 Lợi ích dự kiến</h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {(idea as any).expected_benefit || 'Không có thông tin lợi ích'}
            </p>
          </div>

          {/* Attachments */}
          {idea.attachments && idea.attachments.length > 0 && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6">
              <h2 className="text-lg font-bold text-white mb-3">📎 Tập tin đính kèm</h2>
              <div className="space-y-2">
                {idea.attachments?.map((file: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleDownloadAttachment(file)}
                    className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
                  >
                    <span className="text-white">{file.split('/').pop()}</span>
                    <Download size={16} className="text-cyan-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rejection Reason (if rejected) */}
          {idea.status === 'Rejected' && idea.rejection_reason && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
              <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                <AlertCircle size={18} />
                Lý do từ chối
              </h3>
              <p className="text-red-300">{idea.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="space-y-4">
          {/* Approve Button */}
          <button
            onClick={handleApprove}
            disabled={actionLoading || idea.status !== 'Pending'}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle size={20} />
            Phê Duyệt
          </button>

          {/* Reject Button */}
          <button
            onClick={() => setShowRejectForm(!showRejectForm)}
            disabled={actionLoading || idea.status !== 'Pending'}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle size={20} />
            Từ Chối
          </button>

          {/* Reject Form */}
          {showRejectForm && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
              <label className="block text-sm font-medium text-white">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-red-500 outline-none resize-none"
                rows={4}
              />
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          )}

          {/* Statistics */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">👍 Lượt yêu thích</span>
              <span className="text-2xl font-bold text-cyan-400">{idea.votes_count}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-2">
                <MessageSquare size={16} />
                Bình luận
              </span>
              <span className="text-2xl font-bold text-blue-400">{idea.comments_count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
