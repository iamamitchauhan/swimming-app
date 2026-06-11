/**
 * Global auth state managed by Zustand.
 * Replaces mock-auth.ts for real JWT-based auth.
 * Persists token to localStorage via tokenStorage helper.
 */
import { create } from "zustand";
import { tokenStorage } from "./api/client";

export type UserRole = "super_admin" | "admin" | "coach";

export interface AuthUser {
  _id: string;
  id: string;
  email: string;
  role: UserRole;
  status: string;
  clubId: string | null;
  club: {
    _id: string;
    name: string;
  } | null;
  onboardingStep: number;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: tokenStorage.get(),
  user: null,
  isAuthenticated: !!tokenStorage.get(),

  setAuth: (token, user) => {
    tokenStorage.set(token);
    set({ token, user, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    tokenStorage.clear();
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
