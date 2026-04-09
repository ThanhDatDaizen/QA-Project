
// ===================================================
// TrackIdeas.tsx - QA Coordinator Track Ideas
// Monitor idea status and progress (read-only, no edit)
// ===================================================

import React, { useEffect } from 'react';
import { useIdeas } from '../../hooks/useIdeas';
import { Eye, BarChart3, TrendingUp, Clock } from 'lucide-react';

export const TrackIdeas: React.FC = () => {
  const { ideas, fetchIdeas, loading } = useIdeas({ pageSize: 10 });

  useEffect(() => {
    fetchIdeas();
  }, []);

  // Group ideas by status
  const groupedIdeas = ideas.reduce((acc: any, idea: any) => {
    const status = idea.status || 'Unknown';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(idea);
    return acc;
  }, {});

  // Status statistics
  const statusStats = {
    Draft: ideas.filter((i: any) => i.status === 'Draft').length,
    Submitted: ideas.filter((i: any) => i.status === 'Submitted').length,
    UnderReview: ideas.filter((i: any) => i.status === 'UnderReview').length,
    Approved: ideas.filter((i: any) => i.status === 'Approved').length,
    Rejected: ideas.filter((i: any) => i.status === 'Rejected').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-500 text-white';
      case 'Submitted':
        return 'bg-blue-500 text-white';
      case 'UnderReview':
        return 'bg-yellow-500 text-white';
      case 'Approved':
        return 'bg-green-500 text-white';
      case 'Rejected':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Eye size={32} className="text-purple-400" />
            Track Ideas
          </h1>
          <p className="text-slate-400 text-sm mt-2">Monitor all ideas and their progress</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg">
          <BarChart3 size={20} className="text-purple-400" />
          <span className="text-purple-300 font-semibold">{ideas.length} Total Ideas</span>
        </div>
      </div>

      {/* Status Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(statusStats).map(([status, count]) => (
          <div
            key={status}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-sm text-slate-400 mb-2">{status}</div>
            <div className="text-3xl font-bold text-white">{count}</div>
            <div className={`mt-3 text-xs px-2 py-1 rounded w-fit ${getStatusColor(status)}`}>
              {Math.round((count / ideas.length) * 100) || 0}%
            </div>
          </div>
        ))}
      </div>

      {/* Ideas List by Status */}
      <div className="space-y-6">
        {Object.entries(groupedIdeas).length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Eye size={48} className="mx-auto mb-4 opacity-50" />
            <p>No ideas to track</p>
          </div>
        ) : (
          Object.entries(groupedIdeas).map(([status, statusIdeas]: any) => (
            <div key={status} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              {/* Status Header */}
              <div className={`${getStatusColor(status)} px-6 py-3 font-semibold`}>
                {status} ({statusIdeas.length})
              </div>

              {/* Ideas in this status */}
              <div className="divide-y divide-slate-700">
                {statusIdeas.map((idea: any) => (
                  <div
                    key={idea.id}
                    className="p-4 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg mb-2">
                          {idea.title}
                        </h3>
                        <p className="text-slate-400 text-sm mb-3">
                          {idea.description?.substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <TrendingUp size={16} />
                            <span>{idea.views || 0} views</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Clock size={16} />
                            <span>
                              {new Date(idea.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded">
                              {idea.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackIdeas;
