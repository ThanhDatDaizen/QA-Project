// ===================================================
// TU API ENDPOINTS - Wrapper cho tất cả API calls
// Đây là nơi định nghĩa tất cả communication với Backend Rust
// ===================================================

import { tuApiService } from './tu-service';

// ============================================
// Type Definitions
// ============================================

export interface Idea {
  _id: string;
  title: string;
  description: string;
  author_id: string;
  author_name: string;
  department: string;
  category: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: string;
  updated_at: string;
  attachments?: string[];
  votes_count: number;
  comments_count: number;
  rejection_reason?: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'Admin' | 'QA_Manager' | 'Staff' | 'Guest';
  power: number;
  department: string;
  is_banned: boolean;
  ban_reason?: string;
  ban_expiration?: string;
  created_at: string;
  last_login?: string;
}

export interface Department {
  _id: string;
  name: string;
  description?: string;
  manager_id?: string;
  created_at: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  closure_date: string;
  created_at: string;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  closure_date: string;
  final_closure_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  _id: string; // The backend actually returns `id`, let's check
  id: string;
  idea_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  likes: number;
}

export interface SystemLog {
  _id: string;
  action: string;
  user_id: string;
  user_email: string;
  type: 'REQUEST' | 'ERROR' | 'AUTH' | 'ADMIN';
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// ============================================
// IDEAS API
// ============================================

export const ideasAPI = {
  /**
   * GET /ideas - Lấy danh sách tất cả ideas (có pagination/filter)
   */
  list: async (query?: { skip?: number; limit?: number; status?: string }) => {
    console.log('[TU-IDEAS-API] GET /ideas');
    return tuApiService.get<Idea[]>('/ideas', { params: query });
  },

  /**
   * GET /ideas/:id - Lấy chi tiết một idea
   */
  getDetail: async (ideaId: string) => {
    console.log(`[TU-IDEAS-API] GET /ideas/${ideaId}`);
    return tuApiService.get<Idea>(`/ideas/${ideaId}`);
  },

  /**
   * POST /ideas - Tạo idea mới (Staff submit)
   */
  create: async (data: { title: string; description: string; category: string; expectedBenefit: string }) => {
    console.log('[TU-IDEAS-API] POST /ideas', data);
    return tuApiService.post<Idea>('/ideas', data);
  },

  /**
   * POST /ideas/with-attachment - Tạo idea với file đính kèm
   */
  createWithAttachment: async (formData: FormData) => {
    console.log('[TU-IDEAS-API] POST /ideas/with-attachment');
    return tuApiService.post<Idea>('/ideas/with-attachment', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * PUT /ideas/:id - Cập nhật idea
   */
  update: async (ideaId: string, data: Partial<Idea>) => {
    console.log(`[TU-IDEAS-API] PUT /ideas/${ideaId}`, data);
    return tuApiService.put<Idea>(`/ideas/${ideaId}`, data);
  },

  /**
   * DELETE /ideas/:id - Xóa idea
   */
  delete: async (ideaId: string) => {
    console.log(`[TU-IDEAS-API] DELETE /ideas/${ideaId}`);
    return tuApiService.delete<{ message: string }>(`/ideas/${ideaId}`);
  },

  /**
   * POST /ideas/:id/approve - QA Manager phê duyệt idea
   */
  approve: async (ideaId: string) => {
    console.log(`[TU-IDEAS-API] POST /ideas/${ideaId}/approve`);
    return tuApiService.post<Idea>(`/ideas/${ideaId}/approve`);
  },

  /**
   * POST /ideas/:id/reject - QA Manager từ chối idea
   */
  reject: async (ideaId: string, rejectionReason: string) => {
    console.log(`[TU-IDEAS-API] POST /ideas/${ideaId}/reject`);
    return tuApiService.post<Idea>(`/ideas/${ideaId}/reject`, { rejection_reason: rejectionReason });
  },

  /**
   * POST /ideas/:id/vote - Vote cho idea
   */
  vote: async (ideaId: string, voteValue: 1 | -1 | 'up' | 'down') => {
    console.log(`[TU-IDEAS-API] POST /ideas/${ideaId}/vote = ${voteValue}`);
    // Server expects {"vote_type": "up" | "down"}
    let finalVoteType = voteValue;
    if (voteValue === 1 || voteValue === 'up') finalVoteType = 'up';
    if (voteValue === -1 || voteValue === 'down') finalVoteType = 'down';

    return tuApiService.post<{ message: string; votes_count: number }>(`/ideas/${ideaId}/vote`, {
      vote_type: finalVoteType,
    });
  },

  /**
   * POST /ideas/:id/comments - Bình luận trên idea
   */
  addComment: async (ideaId: string, content: string, isAnonymous: boolean = false) => {
    console.log(`[TU-IDEAS-API] POST /ideas/${ideaId}/comments (Anonymous: ${isAnonymous})`);
    return tuApiService.post<Comment>(`/ideas/${ideaId}/comments`, { 
      content,
      is_anonymous: isAnonymous
    });
  },

  /**
   * GET /ideas/:id/comments
   */
  getComments: async (ideaId: string) => {
    console.log(`[TU-IDEAS-API] GET /ideas/${ideaId}/comments`);
    return tuApiService.get<Comment[]>(`/ideas/${ideaId}/comments`);
  },

  /**
   * POST /ideas/:id/comments/:commentId/like
   */
  likeComment: async (ideaId: string, commentId: string) => {
    console.log(`[TU-IDEAS-API] POST /ideas/${ideaId}/comments/${commentId}/like`);
    return tuApiService.post<Comment>(`/ideas/${ideaId}/comments/${commentId}/like`, {});
  },
};

// ============================================
// USERS API
// ============================================

export const usersAPI = {
  /**
   * GET /admin/users - Lấy danh sách users
   */
  list: async (query?: { skip?: number; limit?: number }) => {
    console.log('[TU-USERS-API] GET /admin/users');
    return tuApiService.get<User[]>('/admin/users', { params: query });
  },

  /**
   * GET /auth/profile - Lấy thông tin profile của user hiện tại
   */
  getProfile: async () => {
    console.log('[TU-USERS-API] GET /auth/profile');
    return tuApiService.get<User>('/auth/profile');
  },

  /**
   * PATCH /admin/users/:id/role - Cập nhật role của user
   */
  updateRole: async (userId: string, newRole: string, newPower: number) => {
    console.log(`[TU-USERS-API] PATCH /admin/users/${userId}/role`);
    return tuApiService.put<User>(`/admin/users/${userId}/role`, { role: newRole, power: newPower });
  },

  /**
   * POST /admin/users/:id/ban - Ban user
   */
  ban: async (userId: string, reason: string, expirationDays: number) => {
    console.log(`[TU-USERS-API] POST /admin/users/${userId}/ban`);
    return tuApiService.post<User>(`/admin/users/${userId}/ban`, {
      ban_reason: reason,
      ban_expiration_days: expirationDays,
    });
  },

  /**
   * POST /admin/users/:id/unban - Unban user
   */
  unban: async (userId: string) => {
    console.log(`[TU-USERS-API] POST /admin/users/${userId}/unban`);
    return tuApiService.post<User>(`/admin/users/${userId}/unban`);
  },

  /**
   * DELETE /admin/users/:id - Xóa user
   */
  delete: async (userId: string) => {
    console.log(`[TU-USERS-API] DELETE /admin/users/${userId}`);
    return tuApiService.delete<{ message: string }>(`/admin/users/${userId}`);
  },

  /**
   * POST /auth/change-password - Thay đổi password
   */
  changePassword: async (oldPassword: string, newPassword: string) => {
    console.log('[TU-USERS-API] POST /auth/change-password');
    return tuApiService.post<{ message: string }>('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
};

// ============================================
// DEPARTMENTS API
// ============================================

export const departmentsAPI = {
  /**
   * GET /departments - Lấy danh sách departments
   */
  list: async () => {
    console.log('[TU-DEPARTMENTS-API] GET /departments');
    return tuApiService.get<Department[]>('/departments');
  },

  /**
   * GET /departments/:id - Lấy chi tiết department
   */
  getDetail: async (deptId: string) => {
    console.log(`[TU-DEPARTMENTS-API] GET /departments/${deptId}`);
    return tuApiService.get<Department>(`/departments/${deptId}`);
  },

  /**
   * POST /departments - Tạo department mới
   */
  create: async (data: { name: string; description?: string }) => {
    console.log('[TU-DEPARTMENTS-API] POST /departments', data);
    return tuApiService.post<Department>('/departments', data);
  },

  /**
   * PUT /departments/:id - Cập nhật department
   */
  update: async (deptId: string, data: Partial<Department>) => {
    console.log(`[TU-DEPARTMENTS-API] PUT /departments/${deptId}`, data);
    return tuApiService.put<Department>(`/departments/${deptId}`, data);
  },

  /**
   * DELETE /departments/:id - Xóa department
   */
  delete: async (deptId: string) => {
    console.log(`[TU-DEPARTMENTS-API] DELETE /departments/${deptId}`);
    return tuApiService.delete<{ message: string }>(`/departments/${deptId}`);
  },
};

// ============================================
// CATEGORIES API
// ============================================

export const categoriesAPI = {
  /**
   * GET /categories - Lấy danh sách categories
   */
  list: async () => {
    console.log('[TU-CATEGORIES-API] GET /categories');
    return tuApiService.get<Category[]>('/categories');
  },

  /**
   * POST /categories - Tạo category mới
   */
  create: async (data: { name: string; description?: string; closure_date: string }) => {
    console.log('[TU-CATEGORIES-API] POST /categories', data);
    return tuApiService.post<Category>('/categories', data);
  },

  /**
   * DELETE /categories/:id - Xóa category
   */
  delete: async (categoryId: string) => {
    console.log(`[TU-CATEGORIES-API] DELETE /categories/${categoryId}`);
    return tuApiService.delete<{ message: string }>(`/categories/${categoryId}`);
  },
};

// ============================================
// ACADEMIC YEARS API
// ============================================

export const academicAPI = {
  list: async () => {
    console.log('[TU-ACADEMIC-API] GET /academic-years');
    return tuApiService.get<AcademicYear[]>('/academic-years');
  },

  getDetail: async (yearId: string) => {
    console.log(`[TU-ACADEMIC-API] GET /academic-years/${yearId}`);
    return tuApiService.get<AcademicYear>(`/academic-years/${yearId}`);
  },

  update: async (yearId: string, data: Partial<AcademicYear>) => {
    console.log(`[TU-ACADEMIC-API] PUT /academic-years/${yearId}`, data);
    return tuApiService.put<AcademicYear>(`/academic-years/${yearId}`, data);
  },

  activate: async (yearId: string) => {
    console.log(`[TU-ACADEMIC-API] POST /academic-years/${yearId}/activate`);
    return tuApiService.post<AcademicYear>(`/academic-years/${yearId}/activate`);
  },
};

// ============================================
// EXPORT API
// ============================================

export const exportAPI = {
  /**
   * GET /export/csv - Export ideas to CSV
   */
  toCSV: async (query?: { startDate?: string; endDate?: string }) => {
    console.log('[TU-EXPORT-API] GET /export/csv');
    const response = await tuApiService.getClient().get('/export/csv', {
      params: query,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * GET /export/zip - Export ideas to ZIP
   */
  toZIP: async (query?: { startDate?: string; endDate?: string }) => {
    console.log('[TU-EXPORT-API] GET /export/zip');
    const response = await tuApiService.getClient().get('/export/zip', {
      params: query,
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================
// ADMIN/SYSTEM API
// ============================================

export const systemAPI = {
  /**
   * GET /admin/system/stats - Lấy thống kê hệ thống
   */
  getStats: async () => {
    console.log('[TU-SYSTEM-API] GET /admin/system/stats');
    return tuApiService.get<{
      total_users: number;
      total_ideas: number;
      total_approved: number;
      total_rejected: number;
      banned_users: number;
      active_sessions: number;
    }>('/admin/system/stats');
  },

  /**
   * GET /admin/traffic/logs - Lấy audit logs
   */
  getLogs: async (query?: { skip?: number; limit?: number; type?: string }) => {
    console.log('[TU-SYSTEM-API] GET /admin/traffic/logs');
    return tuApiService.get<SystemLog[]>('/admin/traffic/logs', { params: query });
  },
};

// ============================================
// FILE UPLOAD API
// ============================================

export const uploadAPI = {
  /**
   * POST /upload - Upload file
   */
  uploadFile: async (file: File) => {
    console.log('[TU-UPLOAD-API] POST /upload');
    const formData = new FormData();
    formData.append('file', file);
    return tuApiService.post<{ file_url: string; file_name: string }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default {
  ideas: ideasAPI,
  users: usersAPI,
  departments: departmentsAPI,
  categories: categoriesAPI,
  export: exportAPI,
  system: systemAPI,
  upload: uploadAPI,
};
