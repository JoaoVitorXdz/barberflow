'use client';

import { useState, useTransition } from 'react';
import { buttonSecondary } from '@/components/ui';
import { cancelAppointmentAction } from './actions';

export function CancelButton({
  slug,
  appointmentId,
}: {
  slug: string;
  appointmentId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm('Cancelar este agendamento?')) {
      return;
    }
    startTransition(async () => {
      const result = await cancelAppointmentAction(slug, appointmentId);
      setError(
        result.ok ? null : (result.error ?? 'Não foi possível cancelar.'),
      );
    });
  }

  return (
    <div className="space-y-1.5 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`${buttonSecondary} cursor-pointer px-3.5 py-1.5 text-xs transition-all hover:border-red-600 hover:bg-red-50 hover:text-red-700 active:scale-[0.98]`}
      >
        {pending ? 'Cancelando...' : 'Cancelar'}
      </button>

      {error && (
        <p
          role="alert"
          className="rounded-sm border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}