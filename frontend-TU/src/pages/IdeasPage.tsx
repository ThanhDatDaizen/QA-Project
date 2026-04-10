// ===================================================
// IdeasPage.tsx - Trang danh sách ý tưởng
// Wrapper cho IdeaList component
// ===================================================

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import IdeaList from '../components/IdeaList';
import useIdeas from '../hooks/useIdeas';
import { useTuIdentity } from '../context/TuIdentityContext';
import { LogOut } from 'lucide-react';

export const IdeasPage: React.FC = () => {
  const { ideas, fetchIdeas, voteIdea, deleteIdea, loading, currentPage, totalPages, currentSort } = useIdeas({ pageSize: 5 });
  const { logout, user } = useTuIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    fetchIdeas(1, 'newest');
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header with Logout */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Ideas</h1>
            <p className="text-slate-400 text-sm truncate">Logged in as: <span className="text-blue-400 font-semibold">{user?.email}</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Ideas List */}
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
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
      </div>
    </div>
  );
};

export default IdeasPage;
