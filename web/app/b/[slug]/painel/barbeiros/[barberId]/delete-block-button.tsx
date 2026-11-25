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
    <div className="space-y-1.5 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`${buttonSecondary} cursor-pointer px-3.5 py-1.5 text-xs hover:border-red-600 hover:bg-red-50 hover:text-red-700 active:scale-[0.98]`}
      >
        {pending ? 'Removendo...' : 'Remover folga'}
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