// ===================================================
// DEPARTMENT MANAGER - Admin manage departments
// Quản lý các phòng ban trong hệ thống
// ===================================================

import React, { useState, useEffect } from 'react';
import { departmentsAPI } from '../../api/tu-api-endpoints';
import { Plus, Trash2, Edit2, Building2, Users } from 'lucide-react';

interface Department {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  memberCount?: number;
}

export const DepartmentManager: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([
    { id: '1', name: 'IT & Technology', description: 'Bộ phận công nghệ thông tin', memberCount: 15 },
    { id: '2', name: 'Marketing', description: 'Bộ phận tiếp thị', memberCount: 8 },
    { id: '3', name: 'HR & Admin', description: 'Nhân sự và hành chính', memberCount: 6 },
    { id: '4', name: 'Sales', description: 'Bộ phận bán hàng', memberCount: 12 },
    { id: '5', name: 'Operations', description: 'Bộ phận vận hành', memberCount: 10 },
  ]);
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '' });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      console.log('[TU-DEPT-MGR] 📥 Loading departments...');
      const response = await departmentsAPI.list();
      if (response.data && Array.isArray(response.data)) {
        setDepartments(response.data);
        console.log('[TU-DEPT-MGR] ✅ Loaded:', response.data.length, 'departments');
      } else {
        console.log('[TU-DEPT-MGR] ℹ️ Using mock departments');
      }
    } catch (error) {
      console.warn('[TU-DEPT-MGR] ⚠️ Loading failed, using mock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newDept.name.trim()) {
      alert('Tên phòng ban không được để trống!');
      return;
    }

    try {
      console.log('[TU-DEPT-MGR] ➕ Creating department...', newDept);
      
      if (editingId) {
        // Update existing
        const response = await departmentsAPI.update(editingId, newDept);
        if (response.data) {
          setDepartments(departments.map(d => 
            (d._id === editingId || d.id === editingId) ? (response.data as Department) : d
          ));
          console.log('[TU-DEPT-MGR] ✅ Updated:', response.data);
        }
      } else {
        // Create new
        const response = await departmentsAPI.create(newDept);
        if (response.data) {
          setDepartments([...departments, response.data]);
          console.log('[TU-DEPT-MGR] ✅ Created:', response.data);
        } else {
          // Fallback: add locally
          const newDeptObj: Department = {
            id: Date.now().toString(),
            ...newDept,
            memberCount: 0,
          };
          setDepartments([...departments, newDeptObj]);
        }
      }
      
      setNewDept({ name: '', description: '' });
      setEditingId(null);
      setShowForm(false);
      alert('✅ Phòng ban đã được cập nhật!');
    } catch (error) {
      console.error('[TU-DEPT-MGR] ❌ Create/Update failed:', error);
      // Still add locally even if API fails
      if (!editingId) {
        const newDeptObj: Department = {
          id: Date.now().toString(),
          ...newDept,
          memberCount: 0,
        };
        setDepartments([...departments, newDeptObj]);
        setNewDept({ name: '', description: '' });
        setShowForm(false);
        alert('✅ Phòng ban đã được thêm (offline mode)');
      }
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingId(dept._id || dept.id || '');
    setNewDept({ name: dept.name, description: dept.description || '' });
    setShowForm(true);
  };

  const handleDelete = async (deptId: string) => {
    const confirmed = window.confirm('Xóa phòng ban này? Hành động này không thể hoàng lại.');
    if (!confirmed) return;

    try {
      console.log(`[TU-DEPT-MGR] 🗑️ Deleting ${deptId}...`);
      await departmentsAPI.delete(deptId);
      setDepartments(departments.filter(d => (d._id || d.id) !== deptId));
      console.log('[TU-DEPT-MGR] ✅ Deleted');
      alert('✅ Đã xóa phòng ban!');
    } catch (error) {
      console.error('[TU-DEPT-MGR] ❌ Delete failed:', error);
      // Still remove locally
      setDepartments(departments.filter(d => (d._id || d.id) !== deptId));
      alert('✅ Phòng ban đã bị xóa (offline mode)');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setNewDept({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-slate-400">Đang tải danh sách phòng ban...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/20 rounded-lg">
            <Building2 size={28} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Quản lý phòng ban</h1>
            <p className="text-slate-400 text-sm">Tổng cộng: {departments.length} phòng ban</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setNewDept({ name: '', description: '' });
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          {showForm ? 'Hủy' : 'Thêm phòng ban'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">
            {editingId ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tên phòng ban *</label>
              <input
                type="text"
                placeholder="ví dụ: IT & Technology"
                value={newDept.name}
                onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Mô tả</label>
              <textarea
                placeholder="Mô tả chức năng của phòng ban..."
                value={newDept.description}
                onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleCreate}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                {editingId ? 'Cập nhật' : 'Tạo'}
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Departments Grid */}
      {departments.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 border border-slate-700 rounded-lg">
          <Building2 size={48} className="mx-auto mb-4 text-slate-500" />
          <p className="text-slate-400 text-lg">Chưa có phòng ban nào</p>
          <p className="text-slate-500 text-sm">Nhấn vào "Thêm phòng ban" để tạo phòng ban mới</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div
              key={dept._id || dept.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-all hover:shadow-lg group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {dept.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-sm text-slate-400">
                      {dept.memberCount || 0} thành viên
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {dept.description && (
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                  {dept.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button
                  onClick={() => handleEdit(dept)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                >
                  <Edit2 size={14} />
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(dept._id || dept.id || '')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded text-sm transition-colors"
                >
                  <Trash2 size={14} />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-cyan-500/10 border border-cyan-500/50 rounded-lg p-4">
        <p className="text-cyan-300 text-sm">
          💡 <strong>Ghi chú:</strong> Các phòng ban được sử dụng để tổ chức và phân loại người dùng trong hệ thống.
        </p>
      </div>
    </div>
  );
};

export default DepartmentManager;
