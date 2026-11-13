'use server';

import { ApiError, apiFetch } from '@/lib/api';
import type { BookingResult, SlotItem, SlotsResponse } from '@/lib/booking-types';

const SESSION_EXPIRED = 'Sua sessão expirou. Entre novamente.';

export async function loadSlotsAction(
  barberId: string,
  serviceId: string,
  date: string,
): Promise<SlotsResponse> {
  try {
    const query = new URLSearchParams({ barberId, serviceId, date });
    const data = await apiFetch<{ slots: SlotItem[] }>(`/availability?${query}`);
    return { slots: data.slots };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        slots: [],
        error: error.status === 401 ? SESSION_EXPIRED : error.message,
      };
    }
    throw error;
  }
}

export async function bookAction(
  barberId: string,
  serviceId: string,
  startsAt: string,
): Promise<BookingResult> {
  try {
    await apiFetch('/appointments', {
      method: 'POST',
      body: JSON.stringify({ barberId, serviceId, startsAt }),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { ok: false, error: SESSION_EXPIRED };
      }
      if (error.status === 409) {
        return {
          ok: false,
          error: 'Esse horário acabou de ser ocupado. Escolha outro.',
        };
      }
      return { ok: false, error: error.message };
    }
    throw error;
  }
}