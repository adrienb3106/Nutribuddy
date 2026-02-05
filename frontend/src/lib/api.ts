import { clearTokens } from "./auth";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function refreshToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  const refresh = window.localStorage.getItem("refresh_token");
  if (!refresh) {
    return null;
  }

  const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = (await response.json()) as { access?: string };
  if (!data.access) {
    return null;
  }

  window.localStorage.setItem("access_token", data.access);
  return data.access;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      return apiFetch<T>(path, options, newToken);
    }
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}