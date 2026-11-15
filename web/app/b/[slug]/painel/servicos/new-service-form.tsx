'use client';

import { useActionState } from 'react';
import { buttonPrimary, card } from '@/components/ui';
import { createServiceAction } from './actions';
import { ServiceFields } from './service-fields';

type FormState = {
  error?: string;
  success?: string;
};

const initialState: FormState = {};

export function NewServiceForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(
    createServiceAction.bind(null, slug),
    initialState,
  );

  return (
    <form action={formAction} className={`${card} space-y-4`}>
      <h2 className="text-lg font-semibold">Novo serviço</h2>
      <ServiceFields />
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
        {pending ? 'Salvando...' : 'Adicionar serviço'}
      </button>
    </form>
  );
}