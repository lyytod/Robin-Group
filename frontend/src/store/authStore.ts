import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Business } from '../types/index';

interface AuthState {
  // State
  token: string | null;
  user: User | null;
  businesses: Business[];
  activeBusiness: Business | null;

  // Actions
  login: (token: string, user: User, businesses: Business[]) => void;
  logout: () => void;
  setActiveBusiness: (business: Business) => void;
  updateBusinesses: (businesses: Business[]) => void;

  // Computed
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      token: null,
      user: null,
      businesses: [],
      activeBusiness: null,
      isSuperAdmin: false,
      isAuthenticated: false,

      // Actions
      login: (token, user, businesses) => {
        localStorage.setItem('robin_group_token', token);
        set({
          token,
          user,
          businesses,
          isSuperAdmin: user.role === 'SUPER_ADMIN',
          isAuthenticated: true,
          // Otomatis pilih usaha pertama sebagai aktif
          activeBusiness: businesses.length > 0 ? businesses[0] : null,
        });
      },

      logout: () => {
        localStorage.removeItem('robin_group_token');
        set({
          token: null,
          user: null,
          businesses: [],
          activeBusiness: null,
          isSuperAdmin: false,
          isAuthenticated: false,
        });
      },

      setActiveBusiness: (business) => {
        set({ activeBusiness: business });
      },

      updateBusinesses: (businesses) => {
        set({ businesses });
      },
    }),
    {
      name: 'robin_group_auth', // Key di localStorage
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        businesses: state.businesses,
        activeBusiness: state.activeBusiness,
        isSuperAdmin: state.user?.role === 'SUPER_ADMIN',
        isAuthenticated: !!state.token && !!state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.user) {
          state.isSuperAdmin = state.user.role === 'SUPER_ADMIN';
          state.isAuthenticated = !!state.token;
        }
      },
    }
  )
);
