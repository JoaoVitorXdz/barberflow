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
    <div className="space-y-1.5 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`${buttonSecondary} cursor-pointer px-4 py-2 text-sm transition-all active:scale-[0.98] ${
          !active
            ? 'border-emerald-700/40 bg-emerald-50/70 text-emerald-900 hover:border-emerald-700 hover:bg-emerald-100/70'
            : ''
        }`}
      >
        {pending ? 'Atualizando...' : active ? 'Desativar barbeiro' : 'Ativar barbeiro'}
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