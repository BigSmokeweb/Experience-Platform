/**
 * Centralized API client.
 * All fetch calls in the app should use this module so the base URL
 * is sourced from NEXT_PUBLIC_API_BASE_URL and never hardcoded.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
};

/**
 * Attempt silent token refresh. If refresh fails or no refreshToken exists,
 * clears the expired/invalid tokens from localStorage and notifies the app.
 * Preserves user identity/destination metadata (userName, userRole, redirect).
 */
export async function trySilentRefreshToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth-change'));
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }
        window.dispatchEvent(new Event('auth-change'));
        return data.accessToken;
      }
    }
  } catch {
    // Network or server error during refresh
  }

  // Refresh failed or returned invalid tokens: clean up bad tokens from storage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.dispatchEvent(new Event('auth-change'));
  return null;
}

async function request<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, token, headers: extraHeaders, ...rest } = options;

  let activeToken = token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
    ...(extraHeaders ?? {}),
  };

  let res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // If 401 and we had sent a token, try a silent token refresh before failing
  if (res.status === 401 && activeToken) {
    const refreshedToken = await trySilentRefreshToken();
    if (refreshedToken) {
      activeToken = refreshedToken;
      const retryHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedToken}`,
        ...(extraHeaders ?? {}),
      };
      res = await fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: retryHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    let errorBody: unknown;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = { message: res.statusText };
    }
    throw Object.assign(new Error(`API ${res.status}: ${path}`), { status: res.status, body: errorBody });
  }

  // 204 No Content — return empty object
  if (res.status === 204) return {} as T;

  return res.json() as Promise<T>;
}

export const api = {
  get: <T = unknown>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),

  post: <T = unknown>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body, token }),

  patch: <T = unknown>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body, token }),

  delete: <T = unknown>(path: string, token?: string) =>
    request<T>(path, { method: 'DELETE', token }),
};
