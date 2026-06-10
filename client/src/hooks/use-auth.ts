/**
 * Auth hooks — TanStack Query + Zustand store.
 *
 * useMe()           → fetches /auth/me, hydrates store
 * useRegister()     → POST /auth/register
 * useLogin()        → POST /auth/login (sends OTP)
 * useVerifyOtp()    → POST /auth/verify-otp (returns JWT)
 * useVerifyEmail()  → GET  /auth/verify-email?token=
 * useLogout()       → POST /auth/logout, clears store
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api/auth.api";
import { useAuthStore } from "../lib/auth.store";
import type { AuthUser } from "../lib/auth.store";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const authKeys = {
  me: ["auth", "me"] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Fetch the authenticated user's profile and hydrate the auth store. */
export function useMe(
  options?: Partial<UseQueryOptions<AuthUser>>,
) {
  const setUser = useAuthStore((s) => s.setUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<AuthUser>({
    queryKey: authKeys.me,
    queryFn: async () => {
      const data = await authApi.me();
      setUser(data.user);
      return data.user;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** POST /auth/register — send verification email. */
export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
  });
}

/** POST /auth/login — request OTP for the given email. */
export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
  });
}

/** POST /auth/verify-otp — verify OTP, receive JWT + user, persist to store. */
export function useVerifyOtp() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      queryClient.setQueryData(authKeys.me, data.user);
    },
  });
}

/** GET /auth/verify-email?token= — one-shot email verification. */
export function useVerifyEmail(token: string) {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: ["auth", "verify-email", token],
    queryFn: async () => {
      const data = await authApi.verifyEmail(token);
      setUser(data.user);
      return data.user;
    },
    enabled: !!token,
    retry: false,
  });
}

/** POST /auth/logout — clear store and redirect to /login. */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate("/login");
    },
  });
}
