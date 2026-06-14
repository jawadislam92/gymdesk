export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Access token is kept in memory; the refresh token lives in localStorage.
let accessToken: string | null = null;
export function setAccessToken(token: string | null): void {
  accessToken = token;
}
export function getAccessToken(): string | null {
  return accessToken;
}

interface ApiOptions extends RequestInit {
  /** Attach the bearer token (default true). */
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };
  if (auth && accessToken) finalHeaders.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[]; error?: { message?: string } };
      const raw = body?.message ?? body?.error?.message ?? message;
      message = Array.isArray(raw) ? raw.join(', ') : raw;
    } catch {
      // keep statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
