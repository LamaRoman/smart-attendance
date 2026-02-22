const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: unknown; error?: { message: string; code?: string } }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        error: json?.error || { message: 'Request failed' },
      };
    }

    return { data: json?.data };
  } catch (err) {
    return {
      error: { message: 'Network error' },
    };
  }
}

export const api = {
  get: (endpoint: string) =>
    apiRequest(endpoint, { method: 'GET' }),

  post: (endpoint: string, body?: unknown) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (endpoint: string, body?: unknown) =>
    apiRequest(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: (endpoint: string, body?: unknown) =>
    apiRequest(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (endpoint: string) =>
    apiRequest(endpoint, { method: 'DELETE' }),
};
