'use client';

import { useActionState } from 'react';
import { buttonPrimary, card } from '@/components/ui';
import type { WorkingHoursItem } from '@/lib/booking-types';
import { WEEKDAY_LABELS } from '@/lib/schedule';
import { saveWorkingHoursAction } from './schedule-actions';

type FormState = {
  error?: string;
  success?: string;
};

const initialState: FormState = {};
const SLOTS = ['a', 'b'] as const;
const timeInput =
  'rounded-sm border border-zinc-400 bg-white px-2 py-1.5 focus:border-zinc-900';

export function WorkingHoursForm({
  slug,
  barberId,
  hours,
}: {
  slug: string;
  barberId: string;
  hours: WorkingHoursItem[];
}) {
  const [state, formAction, pending] = useActionState(
    saveWorkingHoursAction.bind(null, slug, barberId),
    initialState,
  );

  // Os períodos de cada dia, na ordem em que a API entrega (por horário de início)
  const byDay = WEEKDAY_LABELS.map((_, weekday) =>
    hours.filter((item) => item.weekday === weekday),
  );
  const hasExtraPeriods = byDay.some((periods) => periods.length > 2);

  return (
    <form action={formAction} className={`${card} space-y-4`}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Jornada de trabalho</h2>
        <p className="text-sm text-zinc-600">
          Até dois períodos por dia (por exemplo, manhã e tarde). Deixe em branco
          os dias de folga. Os horários são os da barbearia.
        </p>
      </div>

      {hasExtraPeriods && (
        <p className="text-sm text-amber-700">
          Este barbeiro tem mais de dois períodos em algum dia. Ao salvar, só os
          dois primeiros de cada dia serão mantidos.
        </p>
      )}

      <div className="space-y-3">
        {WEEKDAY_LABELS.map((label, weekday) => (
          <div
            key={label}
            className="grid items-center gap-2 sm:grid-cols-[8rem_1fr_1fr]"
          >
            <span className="text-sm font-medium">{label}</span>
            {SLOTS.map((slot, index) => {
              const period = byDay[weekday][index];
              return (
                <div key={slot} className="flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    name={`d${weekday}_${slot}_start`}
                    defaultValue={period?.startTime ?? ''}
                    aria-label={`${label}, ${index + 1}º período, início`}
                    className={timeInput}
                  />
                  <span className="text-zinc-500">até</span>
                  <input
                    type="time"
                    name={`d${weekday}_${slot}_end`}
                    defaultValue={period?.endTime ?? ''}
                    aria-label={`${label}, ${index + 1}º período, fim`}
                    className={timeInput}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-emerald-700">
          {state.success}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? 'Salvando...' : 'Salvar jornada'}
      </button>
    </form>
  );
}