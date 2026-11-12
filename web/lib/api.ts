import 'server-only';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';

export const TOKEN_COOKIE = 'bf_token';
export const SLUG_COOKIE = 'bf_slug';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiInit extends RequestInit {
  auth?: boolean;
}

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { auth = true, headers, ...rest } = init;

  const finalHeaders = new Headers(headers);
  if (rest.body && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = (await cookies()).get(TOKEN_COOKIE)?.value;
    if (token) {
      finalHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    cache: 'no-store',
  });

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const body = await response.json();
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? message);
    } catch {
      // resposta sem corpo JSON: mantém a mensagem padrão
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}