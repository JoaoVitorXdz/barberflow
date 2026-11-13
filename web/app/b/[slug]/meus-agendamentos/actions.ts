'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, apiFetch } from '@/lib/api';
import type { BookingResult } from '@/lib/booking-types';

export async function cancelAppointmentAction(
  slug: string,
  appointmentId: string,
): Promise<BookingResult> {
  try {
    await apiFetch(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, {
      method: 'PATCH',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        return { ok: false, error: 'Sua sessão expirou. Entre novamente.' };
      }
      if (error.status === 409) {
        return {
          ok: false,
          error: 'Este agendamento não pode mais ser cancelado.',
        };
      }
      return { ok: false, error: error.message };
    }
    throw error;
  }

  // Atualiza a lista na tela
  revalidatePath(`/b/${slug}/meus-agendamentos`);
  return { ok: true };
}