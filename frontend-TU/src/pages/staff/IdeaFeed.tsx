// ===================================================
// IDEA FEED - View and Vote on Ideas (Staff Portal)
// ===================================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle, Share2, Filter, Search, User, Clock } from 'lucide-react';

interface IdeaItem {
  id: string;
  title: string;
  description: string;
  author: string;
  department: string;
  category: string;
  votes: number;
  comments: number;
  submittedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  hasUserVoted: boolean;
}

export const IdeaFeed: React.FC = () => {
  // ===================================================
  // Routing & Navigation
  // ===================================================
  const navigate = useNavigate();

  // ===================================================
  // Mock Ideas Data
  // ===================================================
  const [ideas] = useState<IdeaItem[]>([
    {
      id: '1',
      title: 'Implement AI-Powered Chatbot for Customer Support',
      description: 'Deploy an AI chatbot to handle customer inquiries 24/7, reducing support ticket volume by 40% and improving response times.',
      author: 'John Smith',
      department: 'IT',
      category: 'Innovation',
      votes: 145,
      comments: 23,
      submittedDate: '2025-01-20',
      status: 'Approved',
      hasUserVoted: false,
    },
    {
      id: '2',
      title: 'Optimize Office Supply Procurement System',
      description: 'Streamline the procurement process by implementing an integrated supplier management system to reduce costs and improve efficiency.',
      author: 'Sarah Johnson',
      department: 'Operations',
      category: 'Cost Reduction',
      votes: 98,
      comments: 15,
      submittedDate: '2025-01-19',
      status: 'Approved',
      hasUserVoted: true,
    },
    {
      id: '3',
      title: 'Remote Work Wellness Program',
      description: 'Introduce virtual fitness classes, mental health support, and ergonomic workspace assessments for remote employees.',
      author: 'Mike Chen',
      department: 'HR',
      category: 'Employee Wellness',
      votes: 87,
      comments: 32,
      submittedDate: '2025-01-18',
      status: 'Approved',
      hasUserVoted: false,
    },
    {
      id: '4',
      title: 'Renewable Energy Initiative',
      description: 'Convert office operations to 100% renewable energy through solar panels and partnership with green energy providers.',
      author: 'Emma Davis',
      department: 'Sustainability',
      category: 'Sustainability',
      votes: 156,
      comments: 45,
      submittedDate: '2025-01-17',
      status: 'Pending',
      hasUserVoted: false,
    },
    {
      id: '5',
      title: 'Process Automation for Finance Department',
      description: 'Implement RPA (Robotic Process Automation) for invoice processing and expense management to save 200+ hours per month.',
      author: 'David Wilson',
      department: 'Finance',
      category: 'Process Optimization',
      votes: 134,
      comments: 28,
      submittedDate: '2025-01-16',
      status: 'Approved',
      hasUserVoted: false,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('popular');

  // ===================================================
  // Get Unique Categories
  // ===================================================
  const categories = useMemo(() => {
    const cats = new Set(ideas.map((idea) => idea.category));
    return ['All', ...Array.from(cats)];
  }, [ideas]);

  // ===================================================
  // Filter and Sort Ideas
  // ===================================================
  const filteredIdeas = useMemo(() => {
    let filtered = ideas.filter(
      (idea) =>
        (selectedCategory === 'All' || idea.category === selectedCategory) &&
        (idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          idea.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (sortBy === 'popular') {
      filtered.sort((a, b) => b.votes - a.votes);
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
      );
    }

    return filtered;
  }, [ideas, selectedCategory, searchTerm, sortBy]);

  // ===================================================
  // Status Badge Component
  // ===================================================
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles = {
      Approved: 'bg-green-900/30 text-green-400',
      Pending: 'bg-yellow-900/30 text-yellow-400',
      Rejected: 'bg-red-900/30 text-red-400',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          styles[status as keyof typeof styles] || 'bg-slate-700 text-slate-300'
        }`}
      >
        {status}
      </span>
    );
  };

  // ===================================================
  // Idea Card Component
  // ===================================================
  const IdeaCard: React.FC<{ idea: IdeaItem }> = ({ idea }) => (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-purple-600/10">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 
            onClick={() => {
              console.log(`%c[TU-IDEAFEED] 🔗 Navigating to /ideas/${idea.id}`, 'color: #0ea5e9; font-weight: bold;');
              navigate(`/ideas/${idea.id}`);
            }}
            className="text-lg font-bold text-white mb-2 hover:text-purple-400 cursor-pointer transition-colors"
          >
            {idea.title}
          </h3>
          <StatusBadge status={idea.status} />
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-300 text-sm mb-4 line-clamp-2">{idea.description}</p>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <User size={14} />
          <span>{idea.author}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-slate-700/50 rounded">
            {idea.department}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded">
            {idea.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} />
          <span>{idea.submittedDate}</span>
        </div>
      </div>

      {/* Interactions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <div className="flex items-center gap-6 text-sm">
          <button
            className={`flex items-center gap-2 transition-colors ${
              idea.hasUserVoted
                ? 'text-purple-400'
                : 'text-slate-400 hover:text-purple-400'
            }`}
          >
            <ThumbsUp
              size={16}
              fill={idea.hasUserVoted ? 'currentColor' : 'none'}
            />
            <span>{idea.votes}</span>
          </button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors">
            <MessageCircle size={16} />
            <span>{idea.comments}</span>
          </button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-green-400 transition-colors">
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  console.log(
    '%c[TU-STAFF-FEED] 📚 Idea Feed loaded',
    'color: #a855f7; font-weight: bold;'
  );
  console.log('💡 Total ideas:', ideas.length);
  console.log('📊 Displayed ideas:', filteredIdeas.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Idea Feed</h1>
        <p className="text-slate-400">
          Explore innovative ideas from your colleagues and vote for your favorites
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Box */}
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 outline-none transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 outline-none transition-colors"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'recent' | 'popular')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500 outline-none transition-colors"
        >
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recent</option>
        </select>
      </div>

      {/* Ideas Grid */}
      {filteredIdeas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700">
          <p className="text-slate-400 text-lg">No ideas found matching your criteria</p>
        </div>
      )}

      {/* Stats Footer */}
      <div className="bg-gradient-to-r from-purple-900/20 to-slate-900/20 border border-purple-700/30 rounded-lg p-4">
        <p className="text-slate-300 text-sm">
          Showing <span className="font-bold text-purple-400">{filteredIdeas.length}</span> of{' '}
          <span className="font-bold text-purple-400">{ideas.length}</span> ideas
        </p>
      </div>
    </div>
  );
};
