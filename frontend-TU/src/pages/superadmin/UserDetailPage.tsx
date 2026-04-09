// ===================================================
// USER DETAIL PAGE - Admin View User Details & Change Role/Ban
// ===================================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Shield, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { usersAPI, ideasAPI } from '../../api/tu-api-endpoints';
import type { User as UserType, Idea } from '../../api/tu-api-endpoints';

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [userIdeas, setUserIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newPower, setNewPower] = useState(0);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState(7);

  // ===================================================
  // Load user details
  // ===================================================
  useEffect(() => {
    const loadUserDetails = async () => {
      if (!userId) return;
      try {
        console.log(`[TU-USER-DETAIL] 📥 Loading user ${userId}...`);
        // Note: Backend should have GET /admin/users/:id endpoint
        // For now using mock or list
        // TODO: Implement GET /admin/users/:id in Backend
        
        // Load user ideas
        const ideasResponse = await ideasAPI.list();
        if (ideasResponse.data) {
          const userSubmittedIdeas = ideasResponse.data.filter((idea: Idea) => idea.author_id === userId);
          setUserIdeas(userSubmittedIdeas);
          console.log('[TU-USER-DETAIL] ✅ User ideas loaded:', userSubmittedIdeas);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('[TU-USER-DETAIL] ❌ Failed to load user:', error);
        setLoading(false);
      }
    };

    loadUserDetails();
  }, [userId]);

  const handleChangeRole = async () => {
    if (!user || !newRole) {
      alert('Vui lòng chọn role!');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn thay đổi role thành ${newRole} với power level ${newPower}?`
    );
    if (!confirmed) return;

    try {
      console.log(`[TU-USER-DETAIL] 🔄 Updating role for ${user._id}...`);
      const response = await usersAPI.updateRole(user._id, newRole, newPower);
      if (response.data) {
        setUser(response.data);
        setShowRoleModal(false);
        alert('✅ Role đã được cập nhật!');
        console.log('[TU-USER-DETAIL] ✅ Role updated:', response.data);
      }
    } catch (error) {
      console.error('[TU-USER-DETAIL] ❌ Failed to update role:', error);
      alert('❌ Cập nhật role thất bại!');
    }
  };

  const handleBanUser = async () => {
    if (!user || !banReason.trim()) {
      alert('Vui lòng nhập lý do ban!');
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn ban user này trong ${banDays} ngày?`);
    if (!confirmed) return;

    try {
      console.log(`[TU-USER-DETAIL] 🚫 Banning user ${user._id}...`);
      const response = await usersAPI.ban(user._id, banReason, banDays);
      if (response.data) {
        setUser(response.data);
        setShowBanModal(false);
        alert(`✅ User đã bị ban trong ${banDays} ngày!`);
        console.log('[TU-USER-DETAIL] ✅ User banned:', response.data);
      }
    } catch (error) {
      console.error('[TU-USER-DETAIL] ❌ Failed to ban user:', error);
      alert('❌ Ban user thất bại!');
    }
  };

  const handleUnbanUser = async () => {
    if (!user) return;

    const confirmed = window.confirm('Bạn có chắc muốn unban user này?');
    if (!confirmed) return;

    try {
      console.log(`[TU-USER-DETAIL] 🔓 Unbanning user ${user._id}...`);
      const response = await usersAPI.unban(user._id);
      if (response.data) {
        setUser(response.data);
        alert('✅ User đã được bỏ ban!');
        console.log('[TU-USER-DETAIL] ✅ User unbanned:', response.data);
      }
    } catch (error) {
      console.error('[TU-USER-DETAIL] ❌ Failed to unban user:', error);
      alert('❌ Bỏ ban thất bại!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-white">Đang tải thông tin user...</p>
        </div>
      </div>
    );
  }

  // Mock user data (since Backend might not have GET /admin/users/:id yet)
  const mockUser: UserType = {
    _id: userId || '1',
    email: 'user@company.com',
    name: 'John Doe',
    role: 'Staff',
    power: 5,
    department: 'IT',
    is_banned: false,
    created_at: new Date().toISOString(),
  };

  const displayUser = user || mockUser;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/superadmin/users')}
        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
      >
        <ArrowLeft size={20} />
        Quay lại danh sách users
      </button>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - User Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
                <User size={40} className="text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white">{displayUser.name}</h1>
                <p className="text-slate-400 flex items-center gap-2 mt-1">
                  <Mail size={14} />
                  {displayUser.email}
                </p>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-700">
              <div>
                <p className="text-slate-400 text-xs font-medium">Role</p>
                <p className="text-white font-bold text-lg mt-1">{displayUser.role}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Power Level</p>
                <p className="text-cyan-400 font-bold text-lg mt-1">⚡ {displayUser.power}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Phòng ban</p>
                <p className="text-white font-bold text-lg mt-1">{displayUser.department}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">Trạng thái</p>
                <p className={`font-bold text-lg mt-1 ${
                  displayUser.is_banned ? 'text-red-400' : 'text-green-400'
                }`}>
                  {displayUser.is_banned ? '🚫 Bị Ban' : '✅ Bình thường'}
                </p>
              </div>
            </div>

            {/* Ban Status */}
            {displayUser.is_banned && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mt-4">
                <p className="text-red-400 font-semibold flex items-center gap-2">
                  <AlertCircle size={16} />
                  Lý do ban: {displayUser.ban_reason}
                </p>
                {displayUser.ban_expiration && (
                  <p className="text-red-300 text-sm mt-2 flex items-center gap-2">
                    <Clock size={14} />
                    Hết hạn: {new Date(displayUser.ban_expiration).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* User Submissions */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">📝 Ý tưởng đã nộp ({userIdeas.length})</h2>
            
            {userIdeas.length === 0 ? (
              <p className="text-slate-400">Chưa nộp ý tưởng nào</p>
            ) : (
              <div className="space-y-3">
                {userIdeas.map((idea) => (
                  <div
                    key={idea._id}
                    className="p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{idea.title}</h3>
                        <p className="text-slate-400 text-sm mt-1 line-clamp-1">
                          {idea.description}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-4 ${
                        idea.status === 'Approved'
                          ? 'bg-green-900/30 text-green-400'
                          : idea.status === 'Pending'
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-red-900/30 text-red-400'
                      }`}>
                        {idea.status === 'Approved' && '✅ Phê duyệt'}
                        {idea.status === 'Pending' && '⏳ Chờ duyệt'}
                        {idea.status === 'Rejected' && '❌ Từ chối'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Actions */}
        <div className="space-y-4">
          {/* Change Role Button */}
          <button
            onClick={() => {
              setNewRole(displayUser.role);
              setNewPower(displayUser.power);
              setShowRoleModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all"
          >
            <Shield size={18} />
            Đổi Role
          </button>

          {/* Ban/Unban Button */}
          {!displayUser.is_banned ? (
            <button
              onClick={() => setShowBanModal(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all"
            >
              <AlertCircle size={18} />
              Ban User
            </button>
          ) : (
            <button
              onClick={handleUnbanUser}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all"
            >
              <CheckCircle size={18} />
              Unban User
            </button>
          )}

          {/* User Stats */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-4 space-y-3">
            <div>
              <p className="text-slate-400 text-xs mb-1">Tạo tài khoản</p>
              <p className="text-white font-semibold">
                {new Date(displayUser.created_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Lần đăng nhập gần nhất</p>
              <p className="text-white font-semibold">
                {displayUser.last_login
                  ? new Date(displayUser.last_login).toLocaleDateString('vi-VN')
                  : 'Chưa đăng nhập'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Đổi Role cho User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Role mới</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    setNewRole(e.target.value);
                    const powerMap: any = { Admin: 20, QA_Manager: 15, Staff: 5, Guest: 0 };
                    setNewPower(powerMap[e.target.value] || 0);
                  }}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-cyan-500 outline-none"
                >
                  <option value="Admin">Admin (Power 20)</option>
                  <option value="QA_Manager">QA Manager (Power 15)</option>
                  <option value="Staff">Staff (Power 5)</option>
                  <option value="Guest">Guest (Power 0)</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleChangeRole}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Ban User</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Lý do ban</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Nhập lý do ban..."
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-red-500 outline-none resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Thời lượng ban (ngày)</label>
                <input
                  type="number"
                  value={banDays}
                  onChange={(e) => setBanDays(parseInt(e.target.value) || 1)}
                  min="1"
                  max="365"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:border-red-500 outline-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBanUser}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
                >
                  Xác nhận ban
                </button>
                <button
                  onClick={() => setShowBanModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
