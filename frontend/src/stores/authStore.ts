import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const { data } = await api.post('/api/auth/login', { email, password });
        set({ user: data.user, token: data.token, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      },

      logout: () => {
        api.post('/api/auth/logout').catch(() => {});
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      setUser: (user: User) => set({ user }),
    }),
    { name: 'auth-storage' }
  )
);
