// Submissions Page
import React from 'react';
import { useSubmissionStore } from '../store/tu-store';

export const SubmissionsPage: React.FC = () => {
  const { ideas, filters, setFilters } = useSubmissionStore();

  return (
    <div className="bg-tu-dark-beast-900 min-h-screen">
      <div className="tu-container">
        <h1 className="text-4xl font-bold mb-8">Submissions 📝</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="tu-card sticky top-4">
              <h2 className="text-xl font-bold mb-4">Filters</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Search..."
                  className="tu-input w-full"
                  value={filters.search || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
                <select
                  className="tu-input w-full"
                  value={filters.status || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value || undefined })
                  }
                >
                  <option value="">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {ideas.length === 0 ? (
              <div className="tu-card text-center py-12">
                <p className="text-tu-dark-beast-400">No submissions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ideas.map((idea) => (
                  <div key={idea.id} className="tu-card cursor-pointer hover:border-tu-primary-500">
                    <h3 className="text-xl font-bold mb-2">{idea.title}</h3>
                    <p className="text-tu-dark-beast-400 mb-4">{idea.description}</p>
                    <div className="flex gap-4 text-sm text-tu-dark-beast-400">
                      <span>👁️ {idea.views} views</span>
                      <span>❤️ {idea.likes} likes</span>
                      <span>📅 {new Date(idea.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionsPage;
