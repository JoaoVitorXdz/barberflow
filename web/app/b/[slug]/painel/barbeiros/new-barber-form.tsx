'use client';

import { useActionState } from 'react';
import { Field } from '@/components/field';
import { buttonPrimary, card } from '@/components/ui';
import type { ServiceItem } from '@/lib/booking-types';
import { createBarberAction } from './actions';
import { ServiceCheckboxes } from './service-checkboxes';

type FormState = {
  error?: string;
  success?: string;
};

const initialState: FormState = {};

export function NewBarberForm({
  slug,
  services,
}: {
  slug: string;
  services: ServiceItem[];
}) {
  const [state, formAction, pending] = useActionState(
    createBarberAction.bind(null, slug),
    initialState,
  );

  return (
    <form action={formAction} className={`${card} space-y-4`}>
      <h2 className="text-lg font-semibold">Novo barbeiro</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome" name="name" autoComplete="off" minLength={2} />
        <Field label="E-mail (será o login dele)" name="email" type="email" />
        <Field
          label="Telefone (opcional)"
          name="phone"
          type="tel"
          required={false}
        />
        <Field
          label="Senha inicial (mínimo de 8 caracteres)"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
      </div>

      <ServiceCheckboxes services={services} />

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
        {pending ? 'Salvando...' : 'Cadastrar barbeiro'}
      </button>
    </form>
  );
}