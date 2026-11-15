'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api';
import type { BookingResult } from '@/lib/booking-types';
import { parsePriceToCents } from '@/lib/format';

type FormState = { error?: string; success?: string };

interface ServiceInput {
  name: string;
  durationMinutes: number;
  priceCents: number;
}

function parseServiceForm(
  formData: FormData,
): { value: ServiceInput } | { error: string } {
  const name = String(formData.get('name') ?? '').trim();
  const duration = Number(String(formData.get('durationMinutes') ?? '').trim());
  const priceCents = parsePriceToCents(String(formData.get('price') ?? ''));

  if (name.length < 2) {
    return { error: 'Informe o nome do serviço (mínimo de 2 letras).' };
  }
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    return {
      error: 'A duração deve ser um número inteiro de minutos, entre 5 e 480.',
    };
  }
  if (priceCents === null) {
    return { error: 'Informe o preço como 45 ou 45,90.' };
  }
  return { value: { name, durationMinutes: duration, priceCents } };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
    if (error.status === 403) return 'Somente o dono pode gerenciar os serviços.';
    return error.message;
  }
  throw error;
}

export async function createServiceAction(
  slug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseServiceForm(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  try {
    await apiFetch('/services', {
      method: 'POST',
      body: JSON.stringify(parsed.value),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/servicos`);
  return { success: 'Serviço adicionado.' };
}

export async function updateServiceAction(
  slug: string,
  serviceId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseServiceForm(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  try {
    await apiFetch(`/services/${encodeURIComponent(serviceId)}`, {
      method: 'PATCH',
      body: JSON.stringify(parsed.value),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/servicos`);
  return { success: 'Serviço atualizado.' };
}

export async function setServiceActiveAction(
  slug: string,
  serviceId: string,
  active: boolean,
): Promise<BookingResult> {
  try {
    await apiFetch(`/services/${encodeURIComponent(serviceId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/servicos`);
  return { ok: true };
}