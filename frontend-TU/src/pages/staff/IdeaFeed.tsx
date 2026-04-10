// ===================================================
// IDEA FEED - View and Vote on Ideas (Staff Portal)
// ===================================================

import React, { useEffect } from 'react';
import IdeaList from '../../components/IdeaList';
import useIdeas from '../../hooks/useIdeas';

export const IdeaFeed: React.FC = () => {
  const { ideas, fetchIdeas, voteIdea, deleteIdea, loading, currentPage, totalPages, currentSort } = useIdeas({ pageSize: 5 });

  useEffect(() => {
    fetchIdeas(1, 'newest');
  }, [fetchIdeas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Idea Feed</h1>
        <p className="text-slate-400">
          Explore innovative ideas from your colleagues and vote for your favorites
        </p>
      </div>

      {/* Ideas List using shared component */}
      <IdeaList 
        ideas={ideas}
        isLoading={loading}
        onVote={voteIdea}
        onDelete={deleteIdea}
        serverCurrentPage={currentPage}
        serverTotalPages={totalPages}
        serverSortType={currentSort}
        onPageChange={(page) => fetchIdeas(page, currentSort)}
        onSortChange={(sort) => fetchIdeas(1, sort)}
      />
    </div>
  );
};
