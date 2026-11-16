'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api';
import type { BookingResult } from '@/lib/booking-types';

type FormState = { error?: string; success?: string };

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
    if (error.status === 403) return 'Somente o dono pode gerenciar os barbeiros.';
    return error.message;
  }
  throw error;
}

export async function createBarberAction(
  slug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const phone = String(formData.get('phone') ?? '').trim();
  const serviceIds = formData.getAll('serviceIds').map(String);

  if (name.length < 2) {
    return { error: 'Informe o nome do barbeiro (mínimo de 2 letras).' };
  }
  if (password.length < 8) {
    return { error: 'A senha precisa ter no mínimo 8 caracteres.' };
  }

  try {
    await apiFetch('/barbers', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password,
        serviceIds,
        ...(phone ? { phone } : {}),
      }),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/barbeiros`);
  return { success: 'Barbeiro cadastrado.' };
}

export async function updateBarberServicesAction(
  slug: string,
  barberId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const serviceIds = formData.getAll('serviceIds').map(String);

  try {
    await apiFetch(`/barbers/${encodeURIComponent(barberId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ serviceIds }),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/barbeiros`);
  revalidatePath(`/b/${slug}/painel/barbeiros/${barberId}`);
  return { success: 'Serviços atualizados.' };
}

export async function setBarberActiveAction(
  slug: string,
  barberId: string,
  active: boolean,
): Promise<BookingResult> {
  try {
    await apiFetch(`/barbers/${encodeURIComponent(barberId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/barbeiros`);
  revalidatePath(`/b/${slug}/painel/barbeiros/${barberId}`);
  return { ok: true };
}