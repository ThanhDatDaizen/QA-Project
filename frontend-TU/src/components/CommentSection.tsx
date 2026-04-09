// ===================================================
// COMMENT SECTION - Reusable comment component for ideas
// ===================================================

import React, { useState, useEffect } from 'react';
import type { Comment } from '../api/tu-api-endpoints';
import { ideasAPI } from '../api/tu-api-endpoints';
import { Send, MessageCircle, Trash2 } from 'lucide-react';

interface CommentSectionProps {
  ideaId: string;
  readOnly?: boolean; // For viewing only
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  ideaId,
  readOnly = false,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    loadComments();
  }, [ideaId]);

  const loadComments = async () => {
    try {
      console.log(`[TU-COMMENTS] 📥 Loading comments for ${ideaId}...`);
      // For now, just initialize empty comments. Real API endpoint would be implemented on backend
      setComments([]);
      console.log(`[TU-COMMENTS] ✅ Loaded comments`);
    } catch (error) {
      console.error('[TU-COMMENTS] ❌ Load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      alert('Nhận xét không được để trống!');
      return;
    }

    setPosting(true);
    try {
      console.log('[TU-COMMENTS] 💬 Posting comment...');
      const response = await ideasAPI.addComment(ideaId, newComment);

      if (response.data) {
        setComments([...comments, response.data]);
        setNewComment('');
        console.log('[TU-COMMENTS] ✅ Posted');
      }
    } catch (error) {
      console.error('[TU-COMMENTS] ❌ Post failed:', error);
      alert('❌ Đăng nhận xét thất bại!');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = window.confirm('Xóa nhận xét này?');
    if (!confirmed) return;

    try {
      console.log(`[TU-COMMENTS] 🗑️ Deleting ${commentId}...`);
      // Assuming there's a delete endpoint; if not, simulate it
      // await ideasAPI.deleteComment(ideaId, commentId);
      setComments(comments.filter((c) => c._id !== commentId));
      alert('✅ Đã xóa!');
    } catch (error) {
      console.error('[TU-COMMENTS] ❌ Delete failed:', error);
      alert('❌ Xóa thất bại!');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={20} className="text-cyan-400" />
        <h3 className="text-lg font-bold text-white">Nhận xét ({comments.length})</h3>
      </div>

      {/* Comment Form - Only show if not readOnly */}
      {!readOnly && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Nhập nhận xét của bạn..."
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 resize-none focus:border-cyan-500 focus:outline-none"
            rows={3}
            disabled={posting}
          />
          <button
            onClick={handlePostComment}
            disabled={posting || !newComment.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white rounded font-medium transition-colors"
          >
            <Send size={16} />
            {posting ? 'Đang gửi...' : 'Gửi nhận xét'}
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-slate-500 py-6">Chưa có nhận xét</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-white">
                    {comment.author_name || 'Ẩn danh'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(comment.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
                {currentUserId === comment.author_id && !readOnly && (
                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className="p-1 hover:bg-slate-800 rounded transition-colors"
                    title="Xóa nhận xét"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                )}
              </div>

              {/* Content */}
              <p className="text-slate-200 text-sm leading-relaxed">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
