import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import { useIdeas } from '../../hooks/useIdeas';

export const IdeaReviewList: React.FC = () => {
  const { ideas, fetchIdeas, loading } = useIdeas({ pageSize: 50 });
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'All' | 'UnderReview' | 'Approved' | 'Rejected'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchIdeas();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="text-green-500 w-5 h-5" />;
      case 'Rejected':
        return <XCircle className="text-red-500 w-5 h-5" />;
      case 'UnderReview':
        return <Clock className="text-yellow-500 w-5 h-5" />;
      default:
        return <FileText className="text-gray-500 w-5 h-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Approved</span>;
      case 'Rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Rejected</span>;
      case 'UnderReview':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Under Review</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">{status || 'Draft'}</span>;
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesFilter = filter === 'All' || idea.status === filter;
    const matchesSearch = idea.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Review Ideas
          </h1>
          <p className="text-gray-600 mt-2">Manage and review all submitted ideas in the system.</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2">
          {['All', 'UnderReview', 'Approved', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'UnderReview' ? 'Pending Review' : status}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading ideas for review...</p>
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-800">No Ideas Found</h3>
          <p className="text-gray-500 mt-2">No ideas match your current filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIdeas.map((idea: any) => (
            <div key={idea.id || idea._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-start gap-4 transition-all hover:shadow-md hover:border-blue-200">
              <div className="mt-1">
                {getStatusIcon(idea.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800 truncate pr-4">
                    {idea.title}
                  </h3>
                  {getStatusBadge(idea.status)}
                </div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                  {idea.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">
                    {idea.category || 'General'}
                  </span>
                  <span>{new Date(idea.created_at || Date.now()).toLocaleDateString()}</span>
                  <span>Views: {idea.views_count || 0}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => navigate(`/qamanager/ideas/${idea.id || idea._id}`)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium border border-blue-100"
                >
                  <Eye className="w-4 h-4" />
                  Review Page
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
