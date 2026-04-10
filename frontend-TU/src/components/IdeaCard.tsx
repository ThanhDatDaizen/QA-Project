// ===================================================
// IdeaCard.tsx - Component hiển thị một ý tưởng
// Tú code cái này để reusable và xinh đẹp
// ===================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, MessageCircle } from 'lucide-react';
import type { TuIdea, VoteType } from '../types';
import clsx from 'clsx';

interface IdeaCardProps {
  idea: TuIdea;
  onVote?: (ideaId: string, type: VoteType) => void;
  onDelete?: (ideaId: string) => void;
  isLoading?: boolean;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  onVote,
  onDelete,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const [userVoteType, setUserVoteType] = useState<VoteType | null>(
    idea.votes?.[0]?.type || null
  );
  const [isVoting, setIsVoting] = useState(false);

  // Tú tính toán vote count
  const upvotes = idea.votes_up ?? (idea.votes?.filter(v => v.type === 'Up').length || 0);
  const downvotes = idea.votes_down ?? (idea.votes?.filter(v => v.type === 'Down').length || 0);
  const netVotes = upvotes - downvotes;

  /**
   * handleVote - Xử lý vote logic
   * Nếu user bấm Upvote lần 2 thì phải 'Hủy vote' (giống Backend)
   */
  const handleVote = async (voteType: VoteType) => {
    console.log(
      `%c[TU-VOTE] 🗳️ User voting ${voteType} on idea "${idea.title}"`,
      'color: #ffd700; font-weight: bold;'
    );

    // Nếu click cùng type thì hủy vote
    if (userVoteType === voteType) {
      console.log(
        `%c[TU-VOTE] 🔄 Cancelling vote - user already voted ${voteType}`,
        'color: #ff8800;'
      );
      alert(`❌ Your ${voteType === 'Up' ? 'upvote' : 'downvote'} has been cancelled!`);
      setUserVoteType(null);
    } else {
      console.log(
        `%c[TU-VOTE] ✅ Changing vote to ${voteType}`,
        'color: #00ff00;'
      );
      setUserVoteType(voteType);
    }

    setIsVoting(true);
    try {
      await onVote?.(idea.id, voteType);
      console.log(
        `%c[TU-SUCCESS] ✅ Vote registered! Net votes: ${voteType === 'Up' ? upvotes + 1 : downvotes + 1}`,
        'color: #10b981; font-weight: bold;'
      );
    } catch (error) {
      console.error('%c[TU-ERROR] ❌ Vote failed:', 'color: #ff0000;', error);
      alert('❌ Vote failed! Please try again!');
      setUserVoteType(userVoteType); // Revert
    } finally {
      setIsVoting(false);
    }
  };

  /**
   * handleDelete - Xóa idea
   */
  const handleDelete = async () => {
    if (window.confirm('🗑️ Are you sure you want to delete this idea? This action cannot be undone!')) {
      console.log(
        `%c[TU-DELETE] 🗑️ Xóa idea: "${idea.title}"`,
        'color: #ff0000; font-weight: bold;'
      );
      await onDelete?.(idea.id);
      alert('✅ Idea deleted successfully!');
    }
  };

  return (
    <div
      onClick={() => navigate(`/ideas/${idea.id}`)}
      className={clsx(
        // Base styles
        'p-4 sm:p-6 rounded-lg border-2 transition-all duration-300 cursor-pointer',
        'bg-gradient-to-br from-slate-900 to-slate-800',
        'border-slate-700 hover:border-blue-500',

        // Hover effects
        'hover:shadow-lg hover:shadow-blue-500/20',
        'hover:scale-[1.02] hover:bg-gradient-to-br from-slate-800 to-slate-700',

        // Animation
        'transform-gpu',
        isLoading && 'opacity-75 pointer-events-none'
      )}
    >
      {/* Header với tag ẩn danh */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
        <div className="flex-1">
          <h3 
            onClick={(e) => {
              e.stopPropagation();
              console.log(`%c[TU-IDEACARD] 🔗 Navigating to /ideas/${idea.id}`, 'color: #0ea5e9; font-weight: bold;');
              navigate(`/ideas/${idea.id}`);
            }}
            className="text-xl font-bold text-white mb-1 hover:text-blue-400 transition-colors cursor-pointer"
          >
            {idea.title}
          </h3>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm text-slate-400">
              📌 {idea.category || 'General'}
            </span>
            {idea.tags?.includes('anonymous') && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded border border-purple-500/50">
                🕵️ Anonymous
              </span>
            )}
          </div>
        </div>

        {/* Delete button (admin only) */}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={isVoting || isLoading}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded transition-colors"
            title="Delete"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-slate-300 text-sm mb-4 line-clamp-2">
        {idea.description}
      </p>

      {/* Stats row */}
      <div className="flex gap-4 flex-wrap text-xs text-slate-400 mb-4 pb-4 border-b border-slate-700">
        <span className="flex items-center gap-1 hover:text-blue-400 transition-colors">
          👁️ {idea.view_count ?? idea.views ?? 0} views
        </span>
        <span className="flex items-center gap-1 hover:text-pink-400 transition-colors">
          ❤️ {(idea.votes_up ?? 0) - (idea.votes_down ?? 0)} votes
        </span>
        <span className="flex items-center gap-1 hover:text-green-400 transition-colors">
          💬 {idea.comments_count ?? idea.comments?.length ?? 0} comments
        </span>
        <span className="flex items-center gap-1 hover:text-yellow-400 transition-colors ml-auto">
          📅 {new Date(idea.createdAt).toLocaleDateString('en-US')}
        </span>
      </div>

      {/* Vote buttons */}
      <div className="flex gap-2 items-center justify-between flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {/* Upvote button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleVote('Up'); }}
            disabled={isVoting || isLoading}
            className={clsx(
              'px-3 py-2 sm:px-4 rounded font-semibold transition-all duration-200',
              'flex items-center gap-1 text-sm',
              userVoteType === 'Up'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white',
              (isVoting || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
            title={userVoteType === 'Up' ? 'Cancel upvote' : 'Upvote'}
          >
            <span>👍</span>
            <span className="font-bold">{upvotes}</span>
          </button>

          {/* Downvote button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleVote('Down'); }}
            disabled={isVoting || isLoading}
            className={clsx(
              'px-3 py-2 sm:px-4 rounded font-semibold transition-all duration-200',
              'flex items-center gap-1 text-sm',
              userVoteType === 'Down'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white',
              (isVoting || isLoading) && 'opacity-50 cursor-not-allowed'
            )}
            title={userVoteType === 'Down' ? 'Cancel downvote' : 'Downvote'}
          >
            <span>👎</span>
            <span className="font-bold">{downvotes}</span>
          </button>

          {/* Comment button */}
          <button 
            onClick={(e) => { 
              e.stopPropagation();
              navigate(`/ideas/${idea.id}`);
              setTimeout(() => {
                try { window.location.hash = '#comments'; } catch (err) { console.warn('Failed to set hash', err); }
              }, 50);
            }}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-700 rounded hover:bg-slate-600 text-slate-300 hover:text-blue-400 transition-colors"
          >
            <MessageCircle size={18} />
            <span>Comment</span>
          </button>
          
          {/* Share button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(window.location.origin + `/ideas/${idea.id}`);
              alert('Link copied to clipboard!');
            }}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-700 rounded hover:bg-slate-600 text-slate-300 hover:text-green-400 transition-colors"
          >
            <Share2 size={18} />
            <span>Share</span>
          </button>
        </div>

        {/* Net votes display */}
        <div
          className={clsx(
            'px-3 py-1 rounded text-sm font-bold',
            netVotes > 0
              ? 'bg-green-500/20 text-green-400'
              : netVotes < 0
                ? 'bg-red-500/20 text-red-400'
                : 'bg-slate-700 text-slate-300'
          )}
        >
          Net: {netVotes > 0 ? '+' : ''}{netVotes}
        </div>
      </div>

      {/* Debug helper */}
      {false && (
        <div className="mt-3 text-xs text-slate-500 border-t border-slate-700 pt-2">
          🔍 ID: {idea.id.substring(0, 8)}...
        </div>
      )}
    </div>
  );
};

export default IdeaCard;
