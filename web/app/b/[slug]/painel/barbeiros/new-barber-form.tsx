'use client';

import { useActionState } from 'react';
import { Field } from '@/components/field';
import { buttonPrimary } from '@/components/ui';
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
            Equipe
          </span>
          <h2 className="text-lg font-bold text-zinc-900">
            Cadastrar novo barbeiro
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nome"
            name="name"
            autoComplete="off"
            minLength={2}
            placeholder="Ex.: Carlos Mendes"
          />
          <Field
            label="E-mail (será o login dele)"
            name="email"
            type="email"
            placeholder="carlos@barbearia.com"
          />
          <Field
            label="Telefone (opcional)"
            name="phone"
            type="tel"
            required={false}
            placeholder="(81) 99999-9999"
          />
          <Field
            label="Senha inicial (mínimo de 8 caracteres)"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            placeholder="••••••••"
          />
        </div>

        <ServiceCheckboxes services={services} />

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
            {pending ? 'Salvando...' : '+ Cadastrar barbeiro'}
          </button>
        </div>
      </form>
    </div>
  );
}