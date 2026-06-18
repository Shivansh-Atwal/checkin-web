import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'EMPLOYEE';
  permissions: string[];
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (user: UserProfile, token: string, refreshToken: string) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Load initial state from localStorage if present
  const storedToken = localStorage.getItem('token');
  const storedRefreshToken = localStorage.getItem('refreshToken');
  const storedUser = localStorage.getItem('user');

  let parsedUser: UserProfile | null = null;
  if (storedUser) {
    try {
      parsedUser = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem('user');
    }
  }

  return {
    token: storedToken,
    refreshToken: storedRefreshToken,
    user: parsedUser,
    isAuthenticated: !!storedToken && !!parsedUser,

    login: (user, token, refreshToken) => {
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, refreshToken, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    },

    hasPermission: (permission: string) => {
      const { user } = get();
      if (!user) return false;
      // Admin has absolute control override
      if (user.role === 'ADMIN') return true;
      return (user.permissions || []).includes(permission);
    },
  };
});
