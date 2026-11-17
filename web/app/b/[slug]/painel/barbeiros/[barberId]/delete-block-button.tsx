'use client';

import { useState, useTransition } from 'react';
import { buttonSecondary } from '@/components/ui';
import { deleteTimeBlockAction } from './schedule-actions';

export function DeleteBlockButton({
  slug,
  barberId,
  blockId,
}: {
  slug: string;
  barberId: string;
  blockId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm('Remover esta folga? O horário volta a ficar livre.')) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTimeBlockAction(slug, barberId, blockId);
      setError(result.ok ? null : (result.error ?? 'Não foi possível remover.'));
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
        {pending ? 'Removendo...' : 'Remover'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}