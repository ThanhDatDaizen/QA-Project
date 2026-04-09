// ===================================================
// useIdeas - Custom Hook cho tất cả các Idea operations
// Tú viết hook này để tập trung API logic ở đây
// ===================================================

import { useCallback, useState } from 'react';
import { tuApiService } from '../api/tu-service';
import type { TuIdea, PaginatedResponse, VoteType } from '../types';

interface UseIdeasOptions {
  pageSize?: number;
  sortBy?: 'newest' | 'views' | 'votes';
}

export const useIdeas = (options: UseIdeasOptions = {}) => {
  const { pageSize = 5, sortBy = 'newest' } = options;
  
  const [ideas, setIdeas] = useState<TuIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentSort, setCurrentSort] = useState<'newest' | 'views' | 'votes'>(sortBy);

  /**
   * Lấy danh sách ideas từ backend
   */
  const fetchIdeas = useCallback(async (page: number = 1, sort: 'newest' | 'views' | 'votes' = 'newest') => {
    setLoading(true);
    setError(null);

    try {
      console.log(
        `%c[TU-HOOK] 🚀 Lấy danh sách ideas - Page: ${page}, Sort: ${sort}`,
        'color: #0ea5e9; font-weight: bold;'
      );

      // Build query params
      let sortBy_param = 'created_at';
      let sortOrder = 'desc';
      
      if (sort === 'views') {
        sortBy_param = 'views';
        console.log('%c[TU-CONSOLE] 👀 Sorting by VIEWS', 'color: #ffa500;');
      } else if (sort === 'votes') {
        sortBy_param = 'vote_count';
        console.log('%c[TU-CONSOLE] 🔼 Sorting by VOTES', 'color: #ffa500;');
      } else {
        console.log('%c[TU-CONSOLE] 📅 Sorting by NEWEST', 'color: #ffa500;');
      }

      const response = await tuApiService.get<PaginatedResponse<TuIdea>>(
        `/ideas?page=${page}&pageSize=${pageSize}&sortBy=${sortBy_param}&sortOrder=${sortOrder}`
      );

      console.log(
        '%c[TU-HOOK] 📊 Raw response từ Backend:',
        'color: #06b6d4; font-weight: bold;'
      );
      console.log('Full Response Object:', response);
      console.log('Response Type:', typeof response);
      console.log('Is Array?', Array.isArray(response));

      // Handle multiple response formats with detailed logging
      let ideas_data = null;
      let total_count = 0;
      let success = false;

      // Format 1: Wrapped with success flag - { success: true, data: { data: [...], total: 5 } }
      if (response.success && response.data && typeof response.data === 'object' && (response.data as any).data) {
        console.log('%c[TU-DETECT] 📦 Format 1: Wrapped response with success flag', 'color: #fbbf24;');
        ideas_data = (response.data as any).data;
        total_count = (response.data as any).total || ideas_data?.length || 0;
        success = true;
      }
      // Format 2: Direct data array - response.data is array
      else if (response.data && Array.isArray(response.data)) {
        console.log('%c[TU-DETECT] 📦 Format 2: Direct array in data field', 'color: #fbbf24;');
        ideas_data = response.data;
        total_count = (response as any).total || response.data.length;
        success = true;
      }
      // Format 3: Direct object with data array - { data: [...], total: 5, ... }
      else if ((response as any).data && Array.isArray((response as any).data)) {
        console.log('%c[TU-DETECT] 📦 Format 3: Response object with data array property', 'color: #fbbf24;');
        ideas_data = (response as any).data;
        total_count = (response as any).total || ideas_data.length;
        success = true;
      }
      // Format 4: Response IS the array itself (rare case)
      else if (Array.isArray(response)) {
        console.log('%c[TU-DETECT] 📦 Format 4: Response is array itself', 'color: #fbbf24;');
        ideas_data = response as any;
        total_count = ideas_data.length;
        success = true;
      }

      if (success && ideas_data && Array.isArray(ideas_data)) {
        console.log(
          `%c[TU-SUCCESS] ✅ Tú lấy được ${ideas_data.length} ideas thành công!`,
          'color: #10b981; font-weight: bold;'
        );
        console.log(`📊 Total count: ${total_count}, Page: ${page}, Total pages: ${Math.ceil(total_count / pageSize)}`);
        
        setIdeas(ideas_data);
        setCurrentPage(page);
        setCurrentSort(sort);
        setTotalPages(Math.ceil(total_count / pageSize));
        
        console.log('%c[TU-TABLE] 📋 Ideas data:', 'color: #06b6d4;');
        console.table(ideas_data.map((idea: any) => ({
          title: idea.title,
          status: idea.status,
          views: idea.views || 0,
          votes: idea.votes?.length || 0,
          created: idea.createdAt?.substring(0, 10) || 'N/A'
        })));
      } else {
        const errorMsg = response.error?.message || `Không thể lấy ideas - Response structure not recognized`;
        setError(errorMsg);
        console.error('%c[TU-ERROR] ❌ Lỗi lấy ideas:', 'color: #ef4444;', {
          errorMsg,
          responseStructure: {
            hasSuccess: 'success' in response,
            hasData: 'data' in response,
            dataType: typeof (response as any).data,
            isDataArray: Array.isArray((response as any).data),
            hasTotal: 'total' in response,
            hasError: 'error' in response,
          }
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Lỗi khi lấy ideas';
      setError(errorMsg);
      console.error('%c[TU-ERROR] ❌ ' + errorMsg, 'color: #ff0000;', err);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  /**
   * Tạo idea mới
   */
  const createIdea = useCallback(async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      console.log(
        '%c[TU-HOOK] 📝 Đang gửi bài lên kho của Tú, chờ tí nhé!',
        'color: #00ff00; font-weight: bold; font-size: 14px;'
      );
      console.log('📦 Dữ liệu bài được gửi:', data);

      const response = await tuApiService.post<TuIdea>('/ideas', data);

      if (response.success && response.data) {
        console.log(
          '%c[TU-SUCCESS] 🎉 Bài được tạo thành công!!! Tú chúc mừng bạn!',
          'color: #00ff00; font-weight: bold; font-size: 14px;'
        );
        console.log('📌 ID bài mới:', response.data.id);
        
        setIdeas(prev => [response.data as TuIdea, ...prev]);
        return response.data;
      } else {
        const errorMsg = response.error?.message || 'Không thể tạo idea';
        setError(errorMsg);
        console.error('%c[TU-ERROR] ❌ ' + errorMsg, 'color: #ff0000;');
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Lỗi khi tạo idea';
      setError(errorMsg);
      console.error('%c[TU-ERROR] 🔥 Lỗi gửi bài: ' + errorMsg, 'color: #ff0000; font-weight: bold;', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Vote cho idea
   */
  const voteIdea = useCallback(async (ideaId: string, voteType: VoteType) => {
    setLoading(true);
    setError(null);

    try {
      const action = voteType === 'Up' ? '⬆️ Upvote' : '⬇️ Downvote';
      console.log(
        `%c[TU-VOTE] ${action} cho idea ${ideaId}`,
        'color: #f59e0b; font-weight: bold;'
      );

      const response = await tuApiService.post<TuIdea>(
        `/ideas/${ideaId}/vote`,
        { type: voteType }
      );

      if (response.success && response.data) {
        console.log(
          `%c[TU-SUCCESS] ✅ ${action} thành công!`,
          'color: #10b981; font-weight: bold;'
        );
        
        // Update idea in list
        setIdeas(prev =>
          prev.map(idea =>
            idea.id === ideaId ? { ...idea, ...response.data } : idea
          )
        );
        
        return response.data;
      } else {
        const errorMsg = response.error?.message || `Không thể ${voteType.toLowerCase()} idea`;
        setError(errorMsg);
        console.warn('%c[TU-WARN] ⚠️ ' + errorMsg, 'color: #ff8800;');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Lỗi khi vote';
      setError(errorMsg);
      console.error('%c[TU-ERROR] ❌ ' + errorMsg, 'color: #ff0000;', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Xóa idea
   */
  const deleteIdea = useCallback(async (ideaId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log(
        `%c[TU-DELETE] 🗑️ Xóa idea ${ideaId}...`,
        'color: #ef4444; font-weight: bold;'
      );

      const response = await tuApiService.delete(`/ideas/${ideaId}`);

      if (response.success) {
        console.log(
          '%c[TU-SUCCESS] ✅ Xóa thành công!',
          'color: #10b981; font-weight: bold;'
        );
        
        setIdeas(prev => prev.filter(idea => idea.id !== ideaId));
        return true;
      } else {
        const errorMsg = response.error?.message || 'Không thể xóa idea';
        setError(errorMsg);
        console.warn('%c[TU-WARN] ⚠️ ' + errorMsg, 'color: #ff8800;');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Lỗi khi xóa';
      setError(errorMsg);
      console.error('%c[TU-ERROR] ❌ ' + errorMsg, 'color: #ff0000;', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ideas,
    loading,
    error,
    currentPage,
    totalPages,
    currentSort,
    fetchIdeas,
    createIdea,
    voteIdea,
    deleteIdea,
    goToPage: (page: number) => fetchIdeas(page, currentSort),
    changeSort: (sort: 'newest' | 'views' | 'votes') => fetchIdeas(1, sort),
  };
};

export default useIdeas;
