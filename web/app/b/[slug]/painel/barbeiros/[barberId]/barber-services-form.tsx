'use client';

import { useActionState } from 'react';
import { buttonPrimary, card } from '@/components/ui';
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
    <form action={formAction} className={`${card} space-y-4`}>
      <h2 className="text-lg font-semibold">Serviços</h2>
      <ServiceCheckboxes services={services} selectedIds={selectedIds} />
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
        {pending ? 'Salvando...' : 'Salvar serviços'}
      </button>
    </form>
  );
}