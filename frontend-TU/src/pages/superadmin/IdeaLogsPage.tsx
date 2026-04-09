// ===================================================
// IdeaLogsPage.tsx - Trang quản trị ý tưởng
// Xem, duyệt, và xóa các ý tưởng vi phạm
// ===================================================

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

interface Idea {
  id: string;
  title: string;
  author: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  votes: number;
  impact: 'low' | 'medium' | 'high';
}

const mockIdeas: Idea[] = [
  {
    id: '1',
    title: 'Improve API Response Time',
    author: 'John Developer',
    department: 'IT',
    status: 'approved',
    createdAt: '2024-04-05',
    votes: 15,
    impact: 'high',
  },
  {
    id: '2',
    title: 'Implement Dark Mode UI',
    author: 'Lisa Designer',
    department: 'Design',
    status: 'approved',
    createdAt: '2024-04-04',
    votes: 22,
    impact: 'medium',
  },
  {
    id: '3',
    title: 'Add Unit Tests to Backend',
    author: 'Mike Security',
    department: 'QA',
    status: 'pending',
    createdAt: '2024-04-08',
    votes: 8,
    impact: 'high',
  },
  {
    id: '4',
    title: 'Spam idea - deleted later',
    author: 'Unknown User',
    department: 'Unknown',
    status: 'rejected',
    createdAt: '2024-04-03',
    votes: 0,
    impact: 'low',
  },
  {
    id: '5',
    title: 'Optimize Database Queries',
    author: 'Sarah Quality',
    department: 'QA',
    status: 'pending',
    createdAt: '2024-04-07',
    votes: 12,
    impact: 'high',
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return { icon: '✅', text: 'Approved', color: 'bg-green-600/20 text-green-300 border-green-600/50' };
    case 'pending':
      return { icon: '⏳', text: 'Pending', color: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/50' };
    case 'rejected':
      return { icon: '❌', text: 'Rejected', color: 'bg-red-600/20 text-red-300 border-red-600/50' };
    default:
      return { icon: '❓', text: 'Unknown', color: 'bg-slate-600/20 text-slate-300 border-slate-600/50' };
  }
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'high':
      return 'bg-red-600/20 text-red-300 border-red-600/50';
    case 'medium':
      return 'bg-yellow-600/20 text-yellow-300 border-yellow-600/50';
    case 'low':
      return 'bg-blue-600/20 text-blue-300 border-blue-600/50';
    default:
      return 'bg-slate-600/20 text-slate-300 border-slate-600/50';
  }
};

export const IdeaLogsPage: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>(mockIdeas);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);

  useEffect(() => {
    console.log('[TU-ADMIN]: 📋 Loading all ideas from the system...');
  }, []);

  const deleteIdea = (ideaId: string) => {
    const updatedIdeas = ideas.filter((idea) => idea.id !== ideaId);
    setIdeas(updatedIdeas);
    console.log(`[TU-ADMIN]: 🗑️ Idea ${ideaId} has been permanently deleted`);
    setShowConfirmModal(null);
  };

  const approveIdea = (ideaId: string) => {
    const updatedIdeas = ideas.map((idea) =>
      idea.id === ideaId ? { ...idea, status: 'approved' as const } : idea
    );
    setIdeas(updatedIdeas);
    console.log(`[TU-ADMIN]: ✅ Idea ${ideaId} has been approved`);
  };

  const rejectIdea = (ideaId: string) => {
    const updatedIdeas = ideas.map((idea) =>
      idea.id === ideaId ? { ...idea, status: 'rejected' as const } : idea
    );
    setIdeas(updatedIdeas);
    console.log(`[TU-ADMIN]: ❌ Idea ${ideaId} has been rejected`);
  };

  const filteredIdeas = filterStatus === 'all' ? ideas : ideas.filter((idea) => idea.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <span>💡</span>
          <span>Idea Management</span>
        </h2>
        <p className="text-slate-400 text-sm mt-1">Review, approve, and manage all ideas in the system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <p className="text-slate-400 text-sm">Total Ideas</p>
          <p className="text-2xl font-bold text-white">{ideas.length}</p>
        </div>
        <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-4">
          <p className="text-yellow-300 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-300">{ideas.filter(i => i.status === 'pending').length}</p>
        </div>
        <div className="bg-green-600/20 border border-green-600/50 rounded-lg p-4">
          <p className="text-green-300 text-sm">Approved</p>
          <p className="text-2xl font-bold text-green-300">{ideas.filter(i => i.status === 'approved').length}</p>
        </div>
        <div className="bg-red-600/20 border border-red-600/50 rounded-lg p-4">
          <p className="text-red-300 text-sm">Rejected</p>
          <p className="text-2xl font-bold text-red-300">{ideas.filter(i => i.status === 'rejected').length}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-3 border-b border-slate-600 pb-4">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            className={clsx(
              'px-4 py-2 rounded-lg font-semibold transition-all',
              filterStatus === status
                ? 'bg-cyan-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Ideas List */}
      <div className="space-y-4">
        {filteredIdeas.map((idea) => (
          <div key={idea.id} className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 hover:border-slate-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">{idea.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-slate-400">
                  <span>👤 {idea.author}</span>
                  <span>🏢 {idea.department}</span>
                  <span>📅 {idea.createdAt}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={clsx('inline-block px-3 py-1 rounded-full text-xs font-semibold border', getStatusBadge(idea.status).color)}>
                  {getStatusBadge(idea.status).icon} {getStatusBadge(idea.status).text}
                </span>
                <span className={clsx('inline-block px-3 py-1 rounded-full text-xs font-semibold border', getImpactColor(idea.impact))}>
                  {idea.impact.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Stats and Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400">👍</span>
                  <span className="text-white font-semibold">{idea.votes} votes</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {idea.status === 'pending' && (
                  <>
                    <button
                      onClick={() => approveIdea(idea.id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => rejectIdea(idea.id)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition-colors"
                    >
                      ⊘ Reject
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowConfirmModal(idea.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredIdeas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">No ideas found</p>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Delete Idea?</h3>
            <p className="text-slate-300 mb-6">
              This action cannot be undone. The idea will be permanently deleted from the system.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => deleteIdea(showConfirmModal)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaLogsPage;
