'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api';
import type { BookingResult } from '@/lib/booking-types';
import { WEEKDAY_LABELS } from '@/lib/schedule';
import { loadTenant } from '@/lib/tenant';
import { localDateTimeToUtcIso } from '@/lib/timezone';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

type FormState = { error?: string; success?: string };

interface HoursEntry {
  weekday: number;
  startTime: string;
  endTime: string;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
    if (error.status === 403) return 'Somente o dono pode alterar a agenda dos barbeiros.';
    return error.message;
  }
  throw error;
}

function parseSchedule(
  formData: FormData,
): { entries: HoursEntry[] } | { error: string } {
  const entries: HoursEntry[] = [];

  for (let weekday = 0; weekday < WEEKDAY_LABELS.length; weekday++) {
    const label = WEEKDAY_LABELS[weekday];
    const periods: HoursEntry[] = [];

    for (const slot of ['a', 'b']) {
      const startTime = String(formData.get(`d${weekday}_${slot}_start`) ?? '').trim();
      const endTime = String(formData.get(`d${weekday}_${slot}_end`) ?? '').trim();

      if (!startTime && !endTime) continue;
      if (!startTime || !endTime) {
        return { error: `${label}: preencha o início e o fim do período.` };
      }
      if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
        return { error: `${label}: horário inválido.` };
      }
      if (endTime <= startTime) {
        return { error: `${label}: o fim precisa ser depois do início.` };
      }
      periods.push({ weekday, startTime, endTime });
    }

    if (periods.length === 2) {
      const [first, second] = [...periods].sort((x, y) =>
        x.startTime.localeCompare(y.startTime),
      );
      if (second.startTime < first.endTime) {
        return { error: `${label}: os dois períodos se sobrepõem.` };
      }
    }
    entries.push(...periods);
  }

  return { entries };
}

export async function saveWorkingHoursAction(
  slug: string,
  barberId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseSchedule(formData);
  if ('error' in parsed) {
    return { error: parsed.error };
  }

  try {
    await apiFetch(`/barbers/${encodeURIComponent(barberId)}/working-hours`, {
      method: 'PUT',
      body: JSON.stringify({ entries: parsed.entries }),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/barbeiros/${barberId}`);
  return { success: 'Jornada salva.' };
}

export async function createTimeBlockAction(
  slug: string,
  barberId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const reason = String(formData.get('reason') ?? '').trim();

  // O fuso vem do servidor, nunca do formulário.
  const tenant = await loadTenant(slug);
  const startsAt = localDateTimeToUtcIso(
    String(formData.get('startsAt') ?? ''),
    tenant.timezone,
  );
  const endsAt = localDateTimeToUtcIso(
    String(formData.get('endsAt') ?? ''),
    tenant.timezone,
  );

  if (!startsAt || !endsAt) {
    return { error: 'Informe o início e o fim.' };
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    return { error: 'O fim precisa ser depois do início.' };
  }

  try {
    await apiFetch(`/barbers/${encodeURIComponent(barberId)}/time-blocks`, {
      method: 'POST',
      body: JSON.stringify({ startsAt, endsAt, ...(reason ? { reason } : {}) }),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/barbeiros/${barberId}`);
  return { success: 'Folga cadastrada.' };
}

export async function deleteTimeBlockAction(
  slug: string,
  barberId: string,
  blockId: string,
): Promise<BookingResult> {
  try {
    await apiFetch(
      `/barbers/${encodeURIComponent(barberId)}/time-blocks/${encodeURIComponent(blockId)}`,
      { method: 'DELETE' },
    );
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidatePath(`/b/${slug}/painel/barbeiros/${barberId}`);
  return { ok: true };
}