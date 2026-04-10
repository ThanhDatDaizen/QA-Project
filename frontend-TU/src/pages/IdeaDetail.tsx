/**
 * ========================================
 * IDEA DETAIL - Shared Component cho tất cả Roles
 * ========================================
 * Hiển thị chi tiết ý tưởng với logic phân quyền contextual
 * 
 * Power Levels:
 * - 20 (SuperAdmin): View logs + Delete button
 * - 18 (Admin): View user details + Ban button
 * - 15 (QAManager): Approve/Reject buttons
 * - 10 (QACoordinator): Tag selector
 * - 5 (Contributor): Comment + Vote (Like/Dislike)
 * - 1 (Viewer): Read-only
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTuIdentity } from '../context/TuIdentityContext';
import { ideasAPI } from '../api/tu-api-endpoints';
import type { Idea } from '../api/tu-api-endpoints';
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Tag,
  CheckCircle,
  XCircle,
  Download,
  AlertCircle,
  Eye,
  Trash2,
  User,
  Clock,
  FileText,
} from 'lucide-react';

interface IdeaDetailProps {
  ideaId?: string; // Optional - if not provided, use URL param
  readOnly?: boolean; // Force read-only mode
}

export const IdeaDetail: React.FC<IdeaDetailProps> = ({ ideaId: propIdeaId, readOnly = false }) => {
  // ========================================
  // State Management
  // ========================================
  const { user } = useTuIdentity();
  const { id: paramId } = useParams<{ id: string }>(); // Use 'id' from path "/ideas/:id"
  const finalIdeaId = propIdeaId || paramId || '';

  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [voting, setVoting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [deletingIdea, setDeletingIdea] = useState(false);

  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // ========================================
  // Load Idea Details
  // ========================================
  useEffect(() => {
    if (finalIdeaId) {
      loadIdea();
    } else {
      setError("Idea ID is missing in URL");
      setLoading(false);
    }
  }, [finalIdeaId]);

  const loadIdea = async () => {
    if (!finalIdeaId) return;
    try {
      console.log(`[TU-IDEA-DETAIL] 📥 Loading idea ${finalIdeaId}...`);
      setLoading(true);
      setError(null);

      const response = await ideasAPI.getDetail(finalIdeaId);
      if (response.data) {
        setIdea(response.data);
        console.log('[TU-IDEA-DETAIL] ✅ Idea loaded:', response.data);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load idea';
      console.error('[TU-IDEA-DETAIL] ❌ Load error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Normalize ID field - backend may return `id` instead of `_id`
  const ideaUid = idea ? ((idea as any)._id || (idea as any).id || '') : '';
  const shortIdeaId = ideaUid ? ideaUid.substring(0, 8) : '';

  // ========================================
  // Power Level Checker
  // ========================================
  const hasPower = (minPower: number): boolean => {
    return (user?.power || 0) >= minPower;
  };

  // ========================================
  // Action Handlers - Power 15+ (Approve/Reject)
  // ========================================
  const handleApprove = async () => {
    if (!idea) return;

    try {
      console.log(`[TU-IDEA-DETAIL] ✅ Approving idea ${ideaUid}...`);
      setApproving(true);

      const response = await ideasAPI.approve(ideaUid);
      console.log('[TU-IDEA-DETAIL] ✅ Idea approved:', response.data);

      alert('✅ Ý tưởng đã được phê duyệt!');
      if (response.data) setIdea(response.data);
    } catch (err: any) {
      console.error('[TU-IDEA-DETAIL] ❌ Approve error:', err.message);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!idea || !rejectionReason.trim()) {
      alert('Vui lòng nhập lý do từ chối!');
      return;
    }

    try {
      console.log(`[TU-IDEA-DETAIL] ❌ Rejecting idea ${ideaUid}...`);
      setRejecting(true);

      const response = await ideasAPI.reject(ideaUid, rejectionReason);
      console.log('[TU-IDEA-DETAIL] ✅ Idea rejected:', response.data);

      alert(`✅ Ý tưởng đã bị từ chối.\nLý do: ${rejectionReason}`);
      if (response.data) setIdea(response.data);
      setShowRejectForm(false);
      setRejectionReason('');
    } catch (err: any) {
      console.error('[TU-IDEA-DETAIL] ❌ Reject error:', err.message);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setRejecting(false);
    }
  };

  // ========================================
  // Action Handlers - Power 5 (Vote/Comment)
  // ========================================
  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!idea) return;

    try {
      console.log(`[TU-IDEA-DETAIL] 👍 Voting ${voteType} for idea ${ideaUid}...`);
      setVoting(true);

      const voteValue = voteType === 'like' ? 1 : -1;
      const response = await ideasAPI.vote(ideaUid, voteValue);
      console.log('[TU-IDEA-DETAIL] ✅ Vote recorded:', response.data);

      // Vote response doesn't include full idea, just update votes_count
      if (response.data) {
        setIdea((prev) => prev ? { ...prev, votes_count: response.data?.votes_count || prev.votes_count } : null);
      }
      alert(`✅ Bạn đã ${voteType === 'like' ? '👍 thích' : '👎 không thích'} ý tưởng này!`);
    } catch (err: any) {
      console.error('[TU-IDEA-DETAIL] ❌ Vote error:', err.message);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setVoting(false);
    }
  };

  const handleComment = async () => {
    if (!idea || !commentText.trim()) {
      alert('Vui lòng nhập bình luận!');
      return;
    }

    try {
      console.log(`[TU-IDEA-DETAIL] 💬 Adding comment to idea ${ideaUid}...`);
      setCommenting(true);

      const response = await ideasAPI.addComment(ideaUid, commentText);
      console.log('[TU-IDEA-DETAIL] ✅ Comment added:', response.data);

      // Comment response is Comment object, not Idea - just increment comments_count
      if (response.data) {
        setIdea((prev) => prev ? { ...prev, comments_count: prev.comments_count + 1 } : null);
      }
      setCommentText('');
      alert('✅ Bình luận đã được đăng!');
    } catch (err: any) {
      console.error('[TU-IDEA-DETAIL] ❌ Comment error:', err.message);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setCommenting(false);
    }
  };

  // ========================================
  // Action Handlers - Power 10 (Tag Management)
  // ========================================
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    console.log(`[TU-IDEA-DETAIL] 🏷️ Tag toggled: ${tag}`);
  };

  // ========================================
  // Action Handlers - Power 20 (Delete Idea)
  // ========================================
  const handleDeleteIdea = async () => {
    if (!idea) return;

    const confirmed = window.confirm(
      `⚠️ Xóa vĩnh viễn ý tưởng này?\n\nTiêu đề: "${idea.title}"\n\nHành động này không thể hoàn tác!`
    );
    if (!confirmed) return;

    try {
      console.log(`[TU-IDEA-DETAIL] 🗑️ Deleting idea ${ideaUid} permanently...`);
      setDeletingIdea(true);

      await ideasAPI.delete(ideaUid);
      console.log('[TU-IDEA-DETAIL] ✅ Idea deleted');

      alert('✅ Ý tưởng đã bị xóa vĩnh viễn!');
      // Redirect hoặc clear state
      setIdea(null);
    } catch (err: any) {
      console.error('[TU-IDEA-DETAIL] ❌ Delete error:', err.message);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setDeletingIdea(false);
    }
  };

  // ========================================
  // Download Attachment
  // ========================================
  const handleDownloadAttachment = (attachmentUrl: string, fileName: string) => {
    console.log(`[TU-IDEA-DETAIL] 📥 Downloading: ${fileName}`);
    const link = document.createElement('a');
    link.href = attachmentUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========================================
  // UI States
  // ========================================
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Đang tải chi tiết ý tưởng...</p>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-red-200">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle size={20} />
          <p className="font-bold">Lỗi</p>
        </div>
        <p>{error || 'Không tìm thấy ý tưởng'}</p>
      </div>
    );
  }

  // ========================================
  // Main Render
  // ========================================
  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 w-full">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-4 sm:p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{idea.title}</h1>
            <div className="flex items-center gap-4 text-slate-400 text-sm flex-wrap">
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>{idea.author_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{new Date(idea.created_at).toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText size={14} />
                <span>ID: {shortIdeaId ? `${shortIdeaId}...` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          {idea.status && (
            <div
              className={`px-4 py-2 rounded-full font-medium text-sm ${
                idea.status === 'Approved'
                  ? 'bg-green-900/30 text-green-300'
                  : idea.status === 'Rejected'
                  ? 'bg-red-900/30 text-red-300'
                  : 'bg-yellow-900/30 text-yellow-300'
              }`}
            >
              {idea.status === 'Approved' ? '✅ Đã duyệt' : idea.status === 'Rejected' ? '❌ Từ chối' : '⏳ Chờ duyệt'}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-slate-800/50 rounded-lg p-4 sm:p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">📋 Nội dung chi tiết</h2>
        <p className="text-slate-300 leading-relaxed mb-4">{idea.description}</p>

        {/* Department & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {idea.department && (
            <div>
              <p className="text-sm text-slate-400 mb-1">📁 Phòng ban</p>
              <p className="text-white font-medium">{idea.department}</p>
            </div>
          )}
          {idea.category && (
            <div>
              <p className="text-sm text-slate-400 mb-1">🏷️ Danh mục</p>
              <p className="text-white font-medium">{idea.category}</p>
            </div>
          )}
        </div>

        {/* Rejection Reason */}
        {idea.status === 'Rejected' && idea.rejection_reason && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 sm:p-4 mt-4">
            <p className="text-sm text-slate-400 mb-1">❌ Lý do từ chối</p>
            <p className="text-red-200">{idea.rejection_reason}</p>
          </div>
        )}

        {/* Attachments */}
        {idea.attachments && idea.attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-300 mb-3">📎 Các file đính kèm</h3>
            <div className="space-y-2">
              {idea.attachments.map((attachment: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg"
                >
                  <span className="text-slate-300">{attachment.filename || `File ${idx + 1}`}</span>
                  <button
                    onClick={() =>
                      handleDownloadAttachment(
                        attachment.url,
                        attachment.filename || `attachment-${idx}`
                      )
                    }
                    className="flex items-center gap-2 px-3 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded text-sm transition-colors"
                  >
                    <Download size={14} />
                    Tải
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm mb-1">👍 Thích</p>
          <p className="text-2xl font-bold text-green-400">{idea.votes_count || 0}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm mb-1">👎 Không thích</p>
          <p className="text-2xl font-bold text-red-400">{(idea.votes_count * -1) || 0}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm mb-1">💬 Bình luận</p>
          <p className="text-2xl font-bold text-blue-400">{idea.comments_count || 0}</p>
        </div>
      </div>

      {/* Contextual Actions - Power Level Based */}

      {/* 1️⃣ POWER 15+ (QAManager/Admin) - Approve/Reject */}
      {hasPower(15) && !readOnly && (
        <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 rounded-lg p-4 sm:p-6 border border-cyan-700">
          <h3 className="text-lg font-bold text-white mb-4">✅ Phê duyệt / ❌ Từ chối</h3>

          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                <CheckCircle size={20} />
                {approving ? 'Đang phê duyệt...' : 'Phê Duyệt'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={rejecting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                <XCircle size={20} />
                {rejecting ? 'Đang từ chối...' : 'Từ Chối'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={rejecting || !rejectionReason.trim()}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg font-medium"
                >
                  {rejecting ? 'Đang gửi...' : 'Xác Nhận Từ Chối'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2️⃣ POWER 10 (QACoordinator) - Tag Management */}
      {user?.power === 10 && !readOnly && (
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg p-4 sm:p-6 border border-purple-700">
          <h3 className="text-lg font-bold text-white mb-4">🏷️ Gán Nhãn</h3>
          <div className="flex flex-wrap gap-2">
            {['Bug', 'Feature', 'Enhancement', 'Documentation', 'Question'].map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-2 sm:px-4 rounded-lg font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Tag size={16} />
                  {tag}
                </span>
              </button>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <p className="text-sm text-slate-400 mt-3">
              ✅ Đã chọn: {selectedTags.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* 3️⃣ POWER 5 (Contributor) - Comment & Vote */}
      {hasPower(5) && user?.power !== 10 && user?.power !== 20 && !readOnly && (
        <div className="space-y-4">
          {/* Vote Buttons */}
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-4 sm:p-6 border border-purple-700">
            <h3 className="text-lg font-bold text-white mb-4">👍 Bình chọn ý tưởng</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleVote('like')}
                disabled={voting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-green-600/30 hover:bg-green-600/50 disabled:bg-slate-600 border border-green-600 text-green-300 rounded-lg font-medium transition-colors"
              >
                <ThumbsUp size={20} />
                {voting ? '...' : `👍 ${idea.votes_count || 0}`}
              </button>
              <button
                onClick={() => handleVote('dislike')}
                disabled={voting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-red-600/30 hover:bg-red-600/50 disabled:bg-slate-600 border border-red-600 text-red-300 rounded-lg font-medium transition-colors"
              >
                <ThumbsDown size={20} />
                {voting ? '...' : `👎 ${(idea.votes_count * -1) || 0}`}
              </button>
            </div>
          </div>

          {/* Comment Form */}
          <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-lg p-4 sm:p-6 border border-blue-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageCircle size={20} />
              Bình luận
            </h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Chia sẻ ý kiến của bạn về ý tưởng này..."
              className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none mb-3"
              rows={3}
            />
            <button
              onClick={handleComment}
              disabled={commenting || !commentText.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-medium w-full transition-colors"
            >
              <MessageCircle size={18} />
              {commenting ? 'Đang gửi...' : 'Gửi Bình Luận'}
            </button>
          </div>
        </div>
      )}

      {/* 4️⃣ POWER 20 (SuperAdmin) - System Actions */}
      {hasPower(20) && !readOnly && (
        <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-lg p-4 sm:p-6 border border-red-700">
          <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            Hành động Quản trị Viên
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-600 text-orange-300 rounded-lg font-medium transition-colors">
              <Eye size={18} />
              Xem System Logs
            </button>
            <button
              onClick={handleDeleteIdea}
              disabled={deletingIdea}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/30 hover:bg-red-600/50 disabled:bg-slate-600 border border-red-600 text-red-300 rounded-lg font-medium transition-colors"
            >
              <Trash2 size={18} />
              {deletingIdea ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </button>
          </div>
        </div>
      )}

      {/* 5️⃣ POWER 1 (Viewer) - Read Only Message */}
      {user?.power === 1 && (
        <div className="bg-slate-800/50 rounded-lg p-4 sm:p-6 border border-slate-700 text-center">
          <Eye size={24} className="mx-auto mb-2 text-slate-400" />
          <p className="text-slate-300">👁️ Bạn có quyền xem chỉ. Không thể thực hiện các hành động khác.</p>
        </div>
      )}

      {/* Info: Read Only Mode */}
      {readOnly && (
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 sm:p-4 text-blue-200 text-sm">
          ℹ️ Chế độ chỉ xem - Các hành động bị tắt
        </div>
      )}
    </div>
  );
};
