import type { AuthUser, SyncStatus } from "@/types/sync";

const csrfStorageKey = "project-suiii:phase-4-csrf";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
}

export function readCsrfToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(csrfStorageKey);
}

export function writeCsrfToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(csrfStorageKey, token);
  else window.localStorage.removeItem(csrfStorageKey);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    const csrf = readCsrfToken();
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include"
  });
  if (!response.ok) {
    let message = "Request failed";
    try {
      const body = await response.json() as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep the generic message when the server returns an empty body.
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string, remember_me: boolean, device_name: string) {
  const response = await apiRequest<{ user: AuthUser; csrf_token: string; expires_at: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember_me, device_name })
  });
  writeCsrfToken(response.csrf_token);
  return response;
}

export async function logout() {
  await apiRequest<void>("/auth/logout", { method: "POST" });
  writeCsrfToken(null);
}

export function fetchMe() {
  return apiRequest<AuthUser>("/auth/me");
}

export function fetchSyncStatus() {
  return apiRequest<SyncStatus>("/sync/status");
}

export function requestProgressReport(kind: "weekly" | "monthly", period_start: string, period_end: string) {
  return apiRequest<{ id: string; report_type: string; period_start: string; period_end: string; status: string; generated_at: string }>(`/reports/${kind}`, {
    method: "POST",
    body: JSON.stringify({ period_start, period_end })
  });
}

export function reportDownloadUrl(reportId: string) {
  return `${getApiBaseUrl()}/reports/${reportId}/download`;
}
