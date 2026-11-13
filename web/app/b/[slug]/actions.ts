'use server';

import { redirect } from 'next/navigation';
import { ApiError, apiFetch } from '@/lib/api';
import { endSession, startSession } from '@/lib/session';

type FormState = {
  error?: string;
};

interface TokenResponse {
  accessToken: string;
}

export async function loginAction(
  slug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const { accessToken } = await apiFetch<TokenResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({
        tenantSlug: slug,
        email: String(formData.get('email') ?? '').trim(),
        password: String(formData.get('password') ?? ''),
      }),
    });
    await startSession(slug, accessToken);
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        error:
          error.status === 401 ? 'E-mail ou senha incorretos.' : error.message,
      };
    }
    throw error;
  }

  redirect(`/b/${slug}`);
}

export async function registerAction(
  slug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const phone = String(formData.get('phone') ?? '').trim();

  try {
    const { accessToken } = await apiFetch<TokenResponse>(
      '/auth/register-customer',
      {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          tenantSlug: slug,
          name: String(formData.get('name') ?? '').trim(),
          email: String(formData.get('email') ?? '').trim(),
          password: String(formData.get('password') ?? ''),
          ...(phone ? { phone } : {}),
        }),
      },
    );
    await startSession(slug, accessToken);
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    throw error;
  }

  redirect(`/b/${slug}`);
}

export async function logoutAction(slug: string): Promise<void> {
  await endSession();
  redirect(`/b/${slug}`);
}