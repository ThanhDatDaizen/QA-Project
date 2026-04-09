// ===================================================
// Type Definitions - Tôi define các types này cho project
// ===================================================

export type UserRole = 'Admin' | 'Staff' | 'QAM' | 'QAC' | 'Guest';

export interface TuUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  createdAt?: string;
  lastLogin?: string;
}

// ============================================
// Submission / Idea Types
// ============================================

export type IdeaStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Published';

export interface TuIdea {
  id: string;
  title: string;
  description: string;
  content: string;
  category?: string;
  author: TuUser;
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  comments: TuComment[];
  votes?: TuVote[];
  tags?: string[];
}

export interface CreateIdeaRequest {
  title: string;
  description: string;
  content: string;
  category?: string;
  tags?: string[];
}

export interface UpdateIdeaRequest {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  status?: IdeaStatus;
  tags?: string[];
}

// ============================================
// Comment Types
// ============================================

export interface TuComment {
  id: string;
  ideaId: string;
  author: TuUser;
  content: string;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  ideaId: string;
}

// ============================================
// Vote / Assessment Types
// ============================================

export type VoteType = 'Up' | 'Down';

export interface TuVote {
  id: string;
  ideaId: string;
  userId: string;
  type: VoteType;
  createdAt: string;
}

export interface CreateVoteRequest {
  ideaId: string;
  type: VoteType;
}

// ============================================
// Pagination
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  status?: IdeaStatus;
  category?: string;
}

// ============================================
// API Response Types
// ============================================

export interface TuApiError {
  code: string;
  message: string;
  details?: string;
  timestamp?: string;
}

export interface TuApiResponse<T> {
  success: boolean;
  data?: T;
  error?: TuApiError;
}

// ============================================
// Filter & Sort Types
// ============================================

export interface SubmissionFilter {
  status?: IdeaStatus;
  category?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface SubmissionSort {
  sortBy: 'createdAt' | 'views' | 'likes' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalIdeas: number;
  totalUsers: number;
  totalComments: number;
  avgViewsPerIdea: number;
  thisMonthIdeas: number;
  approvalRate: number;
}

export interface UserStats {
  userId: string;
  totalIdeas: number;
  totalComments: number;
  totalVotes: number;
  avgLikes: number;
  mostLikedIdea?: TuIdea;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 'Info' | 'Warning' | 'Success' | 'Error';

export interface TuNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedIdeaId?: string;
  actionUrl?: string;
}

// ============================================
// Form State Types
// ============================================

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormField<T> {
  name: keyof T;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  validation?: (value: any) => string | null;
  options?: Array<{ value: string; label: string }>;
}
