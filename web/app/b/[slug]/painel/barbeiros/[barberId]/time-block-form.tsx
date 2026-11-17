'use client';

import { useActionState } from 'react';
import { Field } from '@/components/field';
import { buttonPrimary } from '@/components/ui';
import { createTimeBlockAction } from './schedule-actions';

type FormState = {
  error?: string;
  success?: string;
};

const initialState: FormState = {};

function DateTimeField({ label, name }: { label: string; name: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="datetime-local"
        name={name}
        required
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-900"
      />
    </label>
  );
}

export function TimeBlockForm({
  slug,
  barberId,
}: {
  slug: string;
  barberId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createTimeBlockAction.bind(null, slug, barberId),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 border-t border-zinc-200 pt-4">
      <h3 className="font-medium">Nova folga ou bloqueio</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField label="Início" name="startsAt" />
        <DateTimeField label="Fim" name="endsAt" />
      </div>
      <Field label="Motivo (opcional)" name="reason" required={false} />
      <p className="text-xs text-zinc-500">
        Para um dia inteiro, vá de 00:00 do dia até 00:00 do dia seguinte. Os
        horários são os da barbearia.
      </p>
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
        {pending ? 'Salvando...' : 'Cadastrar folga'}
      </button>
    </form>
  );
}