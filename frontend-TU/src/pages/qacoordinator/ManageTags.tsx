
// ===================================================
// ManageTags.tsx - QA Coordinator Manage Tags
// Manage tags/categories for ideas
// ===================================================

import React, { useState } from 'react';
import { Tag, Plus, Trash2, Edit2 } from 'lucide-react';

interface TagItem {
  id: string;
  name: string;
  color: string;
  ideaCount: number;
}

export const ManageTags: React.FC = () => {
  const [tags, setTags] = useState<TagItem[]>([
    { id: '1', name: 'Innovation', color: '#3B82F6', ideaCount: 12 },
    { id: '2', name: 'Mobile App', color: '#8B5CF6', ideaCount: 8 },
    { id: '3', name: 'Backend', color: '#EC4899', ideaCount: 5 },
    { id: '4', name: 'UX/UI', color: '#F59E0B', ideaCount: 7 },
    { id: '5', name: 'Performance', color: '#10B981', ideaCount: 3 },
  ]);

  const [newTag, setNewTag] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const colorOptions = [
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F59E0B', // Amber
    '#10B981', // Green
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#F97316', // Orange
  ];

  const handleAddTag = () => {
    if (newTag.trim()) {
      const newTagItem: TagItem = {
        id: Date.now().toString(),
        name: newTag,
        color: selectedColor,
        ideaCount: 0,
      };
      setTags([...tags, newTagItem]);
      setNewTag('');
      setSelectedColor('#3B82F6');
    }
  };

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter((tag) => tag.id !== id));
  };

  const handleEditTag = (id: string) => {
    const tag = tags.find((t) => t.id === id);
    if (tag) {
      setEditingId(id);
      setEditingName(tag.name);
    }
  };

  const handleSaveEdit = (id: string) => {
    setTags(
      tags.map((tag) =>
        tag.id === id ? { ...tag, name: editingName } : tag
      )
    );
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Tag size={32} className="text-purple-400" />
            Manage Tags
          </h1>
          <p className="text-slate-400 text-sm mt-2">Create and manage idea categories</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg">
          <Tag size={20} className="text-purple-400" />
          <span className="text-purple-300 font-semibold">{tags.length} Tags</span>
        </div>
      </div>

      {/* Add New Tag Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Create New Tag</h2>
        <div className="space-y-4">
          {/* Tag Name Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tag Name</label>
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="Enter tag name (e.g., 'Mobile Development')"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tag Color</label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-lg transition-transform ${
                    selectedColor === color ? 'ring-2 ring-white scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add Tag
          </button>
        </div>
      </div>

      {/* Tags List */}
      <div className="grid grid-cols-1 gap-3">
        {tags.length === 0 ? (
          <div className="text-center py-12 bg-slate-800 border border-slate-700 rounded-lg text-slate-400">
            <Tag size={48} className="mx-auto mb-4 opacity-50" />
            <p>No tags created yet</p>
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:border-slate-600 transition-colors group"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Color Indicator */}
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />

                {/* Tag Info */}
                <div className="flex-1">
                  {editingId === tag.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === 'Enter' && handleSaveEdit(tag.id)
                      }
                      onBlur={() => handleSaveEdit(tag.id)}
                      autoFocus
                      className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  ) : (
                    <div>
                      <h3 className="text-white font-semibold">{tag.name}</h3>
                      <p className="text-slate-500 text-sm">
                        {tag.ideaCount} idea{tag.ideaCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEditTag(tag.id)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-blue-400"
                  title="Edit tag"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                  title="Delete tag"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          💡 <strong>Tip:</strong> Tags help organize and categorize ideas. QA Coordinators can create and manage tags
          to better organize the workflow.
        </p>
      </div>
    </div>
  );
};

export default ManageTags;
