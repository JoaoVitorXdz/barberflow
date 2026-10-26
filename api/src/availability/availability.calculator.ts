import { DateTime } from 'luxon';

export interface WorkingWindow {
  weekday: number; // 0 = domingo ... 6 = sábado
  startTime: string; // "HH:MM", hora local da barbearia
  endTime: string; // "HH:MM", hora local da barbearia
}

export interface BusyInterval {
  start: Date; // instante UTC, inclusivo
  end: Date; // instante UTC, exclusivo
}

export interface AvailabilityInput {
  date: string; // "YYYY-MM-DD", dia no fuso da barbearia
  timezone: string; // ex.: "America/Recife"
  serviceDurationMinutes: number;
  stepMinutes: number; // de quanto em quanto tempo oferecer horários
  workingHours: WorkingWindow[];
  busy: BusyInterval[]; // bloqueios + agendamentos ativos
  now: Date;
}

const MINUTE_MS = 60_000;

export function computeAvailableSlots(input: AvailabilityInput): Date[] {
  if (input.stepMinutes <= 0 || input.serviceDurationMinutes <= 0) {
    throw new Error('stepMinutes e serviceDurationMinutes devem ser positivos');
  }

  const day = DateTime.fromISO(input.date, { zone: input.timezone });
  if (!day.isValid) {
    throw new Error(`Data ou fuso inválido: ${input.date} / ${input.timezone}`);
  }

  // luxon: 1 = segunda ... 7 = domingo. Aqui: 0 = domingo ... 6 = sábado.
  const weekday = day.weekday % 7;
  const duration = input.serviceDurationMinutes * MINUTE_MS;
  const step = input.stepMinutes * MINUTE_MS;
  const slots: Date[] = [];

  for (const entry of input.workingHours) {
    if (entry.weekday !== weekday) continue;

    const windowStart = atLocalTime(day, entry.startTime).toMillis();
    const windowEnd = atLocalTime(day, entry.endTime).toMillis();

    for (
      let start = windowStart;
      start + duration <= windowEnd;
      start += step
    ) {
      const end = start + duration;

      if (start < input.now.getTime()) continue;

      const overlapsBusy = input.busy.some(
        (busy) => start < busy.end.getTime() && busy.start.getTime() < end,
      );
      if (!overlapsBusy) {
        slots.push(new Date(start));
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

function atLocalTime(day: DateTime, time: string): DateTime {
  const [hour, minute] = time.split(':').map(Number);
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}