'use client';

import { useActionState } from 'react';
import { buttonPrimary } from '@/components/ui';
import type { ServiceItem } from '@/lib/booking-types';
import { updateBarberServicesAction } from '../actions';
import { ServiceCheckboxes } from '../service-checkboxes';

type FormState = {
  error?: string;
  success?: string;
};

const initialState: FormState = {};

export function BarberServicesForm({
  slug,
  barberId,
  services,
  selectedIds,
}: {
  slug: string;
  barberId: string;
  services: ServiceItem[];
  selectedIds: string[];
}) {
  const [state, formAction, pending] = useActionState(
    updateBarberServicesAction.bind(null, slug, barberId),
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

      <form action={formAction} className="space-y-5 p-5 sm:p-6">
        <div className="border-b border-zinc-200 pb-3">
          <span className="text-[11px] font-bold tracking-widest text-brass uppercase">
            Especialidades
          </span>
          <h2 className="text-lg font-bold text-zinc-900">
            Serviços realizados
          </h2>
        </div>

        <ServiceCheckboxes services={services} selectedIds={selectedIds} />

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
            {pending ? 'Salvando...' : 'Salvar serviços'}
          </button>
        </div>
      </form>
    </div>
  );
}