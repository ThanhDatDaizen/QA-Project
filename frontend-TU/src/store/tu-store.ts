// ===================================================
// TuStore - Global State Management with Zustand
// Tôi dùng Zustand vì nó lightweight và dễ hiểu hơn Redux
// ===================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { TuIdea, TuNotification, DashboardStats } from '../types';

// ============================================
// Submission Store (Ideas)
// ============================================

interface SubmissionState {
  ideas: TuIdea[];
  currentIdea: TuIdea | null;
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    category?: string;
    search?: string;
  };

  // Actions
  setIdeas: (ideas: TuIdea[]) => void;
  addIdea: (idea: TuIdea) => void;
  updateIdea: (id: string, updates: Partial<TuIdea>) => void;
  deleteIdea: (id: string) => void;
  setCurrentIdea: (idea: TuIdea | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: SubmissionState['filters']) => void;
  clearError: () => void;
}

export const useSubmissionStore = create<SubmissionState>()(
  devtools(
    (set) => ({
      ideas: [],
      currentIdea: null,
      loading: false,
      error: null,
      filters: {},

      setIdeas: (ideas) => {
        console.log('%c[TU-STORE] 📚 Ideas updated in store', 'color: #0ea5e9;');
        set({ ideas });
      },

      addIdea: (idea) => {
        console.log(
          `%c[TU-STORE] ➕ New idea added: ${idea.title}`,
          'color: #10b981;'
        );
        set((state) => ({
          ideas: [idea, ...state.ideas],
        }));
      },

      updateIdea: (id, updates) => {
        console.log(
          `%c[TU-STORE] ✏️ Idea ${id} updated`,
          'color: #f59e0b;'
        );
        set((state) => ({
          ideas: state.ideas.map((idea) =>
            idea.id === id ? { ...idea, ...updates } : idea
          ),
          currentIdea:
            state.currentIdea?.id === id
              ? { ...state.currentIdea, ...updates }
              : state.currentIdea,
        }));
      },

      deleteIdea: (id) => {
        console.log(
          `%c[TU-STORE] 🗑️ Idea ${id} deleted`,
          'color: #ef4444;'
        );
        set((state) => ({
          ideas: state.ideas.filter((idea) => idea.id !== id),
          currentIdea: state.currentIdea?.id === id ? null : state.currentIdea,
        }));
      },

      setCurrentIdea: (idea) => {
        console.log(
          `%c[TU-STORE] 🎯 Current idea set: ${idea?.title || 'null'}`,
          'color: #8b5cf6;'
        );
        set({ currentIdea: idea });
      },

      setLoading: (loading) => set({ loading }),

      setError: (error) => {
        if (error) {
          console.error('%c[TU-STORE] ❌ Error:', 'color: #ef4444;', error);
        }
        set({ error });
      },

      setFilters: (filters) => {
        console.log('%c[TU-STORE] 🔍 Filters applied:', 'color: #0ea5e9;', filters);
        set({ filters });
      },

      clearError: () => set({ error: null }),
    })
  )
);

// ============================================
// Notification Store
// ============================================

interface NotificationState {
  notifications: TuNotification[];

  // Actions
  addNotification: (notification: TuNotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],

      addNotification: (notification) => {
        console.log(
          `%c[TU-STORE] 🔔 Notification added: ${notification.title}`,
          `color: ${notification.type === 'Error' ? '#ef4444' : '#0ea5e9'};`
        );
        set((state) => ({
          notifications: [notification, ...state.notifications],
        }));

        // Auto remove after 5 seconds nếu là info
        if (notification.type === 'Info') {
          setTimeout(() => {
            set((state) => ({
              notifications: state.notifications.filter(
                (n) => n.id !== notification.id
              ),
            }));
          }, 5000);
        }
      },

      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      clearAll: () => {
        console.log('%c[TU-STORE] 🗑️ All notifications cleared', 'color: #f59e0b;');
        set({ notifications: [] });
      },
    })
  )
);

// ============================================
// UI State Store (UI-related global state)
// ============================================

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  language: 'vi' | 'en';

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  setLanguage: (lang: 'vi' | 'en') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      darkMode: true,
      language: 'vi',

      toggleSidebar: () =>
        set((state) => ({
          sidebarOpen: !state.sidebarOpen,
        })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleDarkMode: () =>
        set((state) => ({
          darkMode: !state.darkMode,
        })),

      setDarkMode: (dark) => {
        set({ darkMode: dark });
        // Apply to document
        if (dark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setLanguage: (lang) => {
        console.log(`%c[TU-STORE] 🌐 Language changed to ${lang}`, 'color: #0ea5e9;');
        set({ language: lang });
        localStorage.setItem('tu_language', lang);
      },
    })
  )
);

// ============================================
// Dashboard Stats Store
// ============================================

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;

  // Actions
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      stats: null,
      loading: false,

      setStats: (stats) => {
        console.log(
          '%c[TU-STORE] 📊 Dashboard stats updated',
          'color: #0ea5e9;',
          stats
        );
        set({ stats });
      },

      setLoading: (loading) => set({ loading }),
    })
  )
);

export default {
  useSubmissionStore,
  useNotificationStore,
  useUIStore,
  useDashboardStore,
};
