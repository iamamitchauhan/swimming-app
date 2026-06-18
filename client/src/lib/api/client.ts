/**
 * Axios instance with:
 *  - Base URL from VITE_API_BASE_URL (falls back to localhost:3001)
 *  - Automatic Bearer token injection from localStorage
 *  - 401 auto-redirect to /login (clears token first)
 *  - Normalised error shape thrown as ApiError
 */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}

export class ApiError extends Error {
  status: number;
  code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// ─── Token helpers ─────────────────────────────────────────────────────────────

const TOKEN_KEY = "swimclub.token";

export const tokenStorage = {
  get: (): string | null =>
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL:
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL) ||
    "http://localhost:3001/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.get();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor — unwrap data / normalise errors ───────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response,
  (error: AxiosError<ApiResponse>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const message = body?.message || error.message || "Something went wrong. Please try again.";
    const code = body?.error ?? null;

    // Auto-logout on 401
    if (status === 401) {
      tokenStorage.clear();
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new ApiError(message, status, code));
  },
);

// ─── Convenience wrapper that unwraps ApiResponse<T> ─────────────────────────

export async function api<T>(promise: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  const res = await promise;
  return res.data.data;
}
