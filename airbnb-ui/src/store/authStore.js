import { create } from 'zustand';
import { authApi } from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state by checking current session
  initAuth: async () => {
    set({ isLoading: true });
    try {
      const resp = await authApi.getCurrentUser();
      // backend may return either { user: {...} } or the user object directly
      const user = resp?.user ? resp.user : resp;
      set({ user, isAuthenticated: !!user, isLoading: false });
      return { user, isAuthenticated: !!user };
    } catch (error) {
      // 401 is expected when user is not logged in - not an error
      const isUnauthorized = error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized');
      set({ user: null, isAuthenticated: false, isLoading: false });
      // Only throw if it's not a 401 (actual error)
      if (!isUnauthorized) {
        throw error;
      }
      return { user: null, isAuthenticated: false };
    }
  },

  // Login
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login(credentials);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      set({ isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  // Signup
  signup: async (userData) => {
    set({ isLoading: true });
    try {
      const data = await authApi.signup(userData);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      set({ isLoading: false, isAuthenticated: false });
      throw err;
    }
  },

  // Logout
  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Update user profile
  updateUser: (userData) => {
    set({ user: { ...get().user, ...userData } });
  },

  // Check if user is owner
  isOwner: () => {
    return get().user?.user_type === 'owner';
  },

  // Check if user is traveler
  isTraveler: () => {
    return get().user?.user_type === 'traveler';
  },
}));
