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
    <div className="space-y-1 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={buttonSecondary}
      >
        {pending ? 'Cancelando...' : 'Cancelar'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}