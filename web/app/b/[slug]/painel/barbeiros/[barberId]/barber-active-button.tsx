'use client';

import { useState, useTransition } from 'react';
import { buttonSecondary } from '@/components/ui';
import { setBarberActiveAction } from '../actions';

export function BarberActiveButton({
  slug,
  barberId,
  active,
}: {
  slug: string;
  barberId: string;
  active: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (
      active &&
      !window.confirm(
        'Desativar este barbeiro? Ele deixa de receber novos agendamentos; os já marcados continuam.',
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await setBarberActiveAction(slug, barberId, !active);
      setError(
        result.ok ? null : (result.error ?? 'Não foi possível atualizar.'),
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
        {active ? 'Desativar' : 'Ativar'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}