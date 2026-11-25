'use client';

import { useActionState } from 'react';
import { buttonPrimary } from '@/components/ui';
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
    <div className="brass-card overflow-hidden">
      {pending && (
        <div
          className="pole-stripe pole-stripe-loading"
          aria-hidden="true"
        />
      )}

      <form action={formAction} className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-brass uppercase">
              Catálogo
            </span>
            <h2 className="text-lg font-bold text-zinc-900">
              Adicionar novo serviço
            </h2>
          </div>
        </div>

        <ServiceFields />

        {state.error && (
          <p
            role="alert"
            className="rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            {state.error}
          </p>
        )}

        {state.success && (
          <p
            role="status"
            className="rounded-sm border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800"
          >
            {state.success}
          </p>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={pending}
            className={`${buttonPrimary} cursor-pointer shadow-sm transition-transform active:scale-[0.98]`}
          >
            {pending ? 'Salvando...' : '+ Adicionar serviço'}
          </button>
        </div>
      </form>
    </div>
  );
}