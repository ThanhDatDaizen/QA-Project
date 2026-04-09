// ===================================================
// IdeaList.tsx - Component hiển thị danh sách ý tưởng
// Tú code cái này với pagination và sorting
// ===================================================

import React, { useState, useEffect } from 'react';
import type { TuIdea, VoteType } from '../types';
import { IdeaCard } from './IdeaCard';
import clsx from 'clsx';

type SortType = 'newest' | 'views' | 'votes';

interface IdeaListProps {
  ideas: TuIdea[];
  isLoading?: boolean;
  onVote?: (ideaId: string, type: VoteType) => void;
  onDelete?: (ideaId: string) => void;
  pageSize?: number;
}

export const IdeaList: React.FC<IdeaListProps> = ({
  ideas = [],
  isLoading = false,
  onVote,
  onDelete,
  pageSize = 5,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortType, setSortType] = useState<SortType>('newest');

  // Reset page khi ideas thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [ideas]);

  /**
   * sortedIdeas - Sắp xếp ideas dựa trên sortType
   * Sort logic: newest (createdAt), popular (views), trending (votes)
   */
  const sortedIdeas = React.useMemo(() => {
    const sorted = [...ideas];

    switch (sortType) {
      case 'newest':
        sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'views':
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'votes':
        sorted.sort(
          (a, b) =>
            (b.votes?.length || 0) - (a.votes?.length || 0)
        );
        break;
      default:
        break;
    }

    return sorted;
  }, [ideas, sortType]);

  /**
   * paginatedIdeas - Phân trang
   * Mỗi page hiển thị pageSize ideas
   */
  const totalPages = Math.ceil(sortedIdeas.length / pageSize);
  const paginatedIdeas = sortedIdeas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Xử lý empty state
  if (ideas.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">💡</div>
        <h3 className="text-xl font-bold text-white mb-2">
          No Ideas Found
        </h3>
        <p className="text-slate-400">
          Be the first one to share an amazing idea!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex gap-3 justify-between items-center flex-wrap bg-slate-800 p-4 rounded-lg border border-slate-700">
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-sm text-slate-400">🔍 Sort by:</span>
          {(['newest', 'views', 'votes'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setSortType(type);
                setCurrentPage(1);
              }}
              className={clsx(
                'px-3 py-1 text-sm rounded font-semibold transition-all duration-200',
                sortType === type
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
              )}
            >
              {type === 'newest' && '📅 Newest'}
              {type === 'views' && '👁️ Most Viewed'}
              {type === 'votes' && '🔥 Trending'}
            </button>
          ))}
        </div>

        <div className="text-sm text-slate-400">
          Showing {paginatedIdeas.length} of {sortedIdeas.length} ideas
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid gap-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: pageSize }).map((_, i) => (
            <div
              key={i}
              className="p-6 bg-slate-800 rounded-lg border border-slate-700 animate-pulse"
            >
              <div className="h-6 bg-slate-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-slate-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-700 rounded w-2/3"></div>
            </div>
          ))
        ) : paginatedIdeas.length === 0 ? (
          // Empty page state
          <div className="text-center py-8 text-slate-400">
            📭 No ideas on this page
          </div>
        ) : (
          // Actual ideas
          paginatedIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onVote={onVote}
              onDelete={onDelete}
              isLoading={isLoading}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 bg-slate-800 p-4 rounded-lg border border-slate-700">
          {/* Previous button */}
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={clsx(
              'px-3 py-2 rounded font-semibold transition-all duration-200',
              currentPage === 1
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            )}
          >
            ← Previous
          </button>

          {/* Page indicators */}
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => {
              const page = i + 1;
              // Show current page, first page, last page, and pages around current
              const show =
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1;

              if (!show && i > 0 && i < totalPages - 1) {
                // Only show ellipsis once
                if (i === 1 && currentPage > 3) {
                  return <span key={`ellipsis-${i}`} className="px-1 text-slate-400">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={clsx(
                    'w-10 h-10 rounded font-semibold transition-all duration-200',
                    page === currentPage
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={clsx(
              'px-3 py-2 rounded font-semibold transition-all duration-200',
              currentPage === totalPages
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            )}
          >
            Next →
          </button>
        </div>
      )}

      {/* Debug info */}
      {false && (
        <div className="text-xs text-slate-500 bg-slate-800 p-2 rounded border border-slate-700">
          🔍 Debug: Page {currentPage} of {totalPages} | Sort: {sortType} | Items: {paginatedIdeas.length}
        </div>
      )}
    </div>
  );
};

export default IdeaList;
