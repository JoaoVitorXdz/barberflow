import 'server-only';
import { cookies } from 'next/headers';
import { ApiError, SLUG_COOKIE, TOKEN_COOKIE, apiFetch } from '@/lib/api';

export interface Session {
  userId: string;
  tenantId: string;
  role: string;
  slug: string;
}

// A sessão só vale para a barbearia em que o login foi feito.
export async function getSession(slug: string): Promise<Session | null> {
  const store = await cookies();
  if (!store.get(TOKEN_COOKIE)?.value || store.get(SLUG_COOKIE)?.value !== slug) {
    return null;
  }

  try {
    const me = await apiFetch<{ sub: string; tenantId: string; role: string }>(
      '/auth/me',
    );
    return { userId: me.sub, tenantId: me.tenantId, role: me.role, slug };
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      return null; // token expirado
    }
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function startSession(
  slug: string,
  accessToken: string,
): Promise<void> {
  const store = await cookies();
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // igual à validade do token (1 hora)
  };
  store.set(TOKEN_COOKIE, accessToken, options);
  store.set(SLUG_COOKIE, slug, options);
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  store.delete(SLUG_COOKIE);
}