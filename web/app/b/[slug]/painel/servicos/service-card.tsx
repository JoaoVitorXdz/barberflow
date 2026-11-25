'use client';

import { useActionState, useState, useTransition } from 'react';
import { buttonPrimary, buttonSecondary } from '@/components/ui';
import type { ServiceItem } from '@/lib/booking-types';
import { centsToInput, formatDuration, formatPrice } from '@/lib/format';
import { setServiceActiveAction, updateServiceAction } from './actions';
import { ServiceFields } from './service-fields';

type FormState = {
  error?: string;
  [key: string]: unknown;
};

const initialState: FormState = {};

export function ServiceCard({
  slug,
  service,
}: {
  slug: string;
  service: ServiceItem;
}) {
  const [editing, setEditing] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggling, startToggle] = useTransition();

  const [state, formAction, saving] = useActionState(
    async (previous: FormState, formData: FormData): Promise<FormState> => {
      const result = await updateServiceAction(
        slug,
        service.id,
        previous,
        formData,
      );
      if (!result.error) {
        setEditing(false);
      }
      return result;
    },
    initialState,
  );

  function toggle() {
    if (
      service.active &&
      !window.confirm(
        'Desativar este serviço? Ele deixa de aparecer para os clientes.',
      )
    ) {
      return;
    }
    startToggle(async () => {
      const result = await setServiceActiveAction(
        slug,
        service.id,
        !service.active,
      );
      setToggleError(
        result.ok ? null : (result.error ?? 'Não foi possível atualizar.'),
      );
    });
  }

  if (editing) {
    return (
      <div className="animate-fade-up brass-card overflow-hidden bg-zinc-50/70">
        {saving && (
          <div
            className="pole-stripe pole-stripe-loading"
            aria-hidden="true"
          />
        )}

        <form action={formAction} className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2.5">
            <span className="text-xs font-bold tracking-wider text-brass uppercase">
              Editando: {service.name}
            </span>
          </div>

          <ServiceFields
            defaults={{
              name: service.name,
              duration: String(service.durationMinutes),
              price: centsToInput(service.priceCents),
            }}
          />

          {state.error && (
            <p
              role="alert"
              className="rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="submit"
              disabled={saving}
              className={`${buttonPrimary} cursor-pointer px-4 py-2 text-sm transition-transform active:scale-[0.98]`}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={`${buttonSecondary} cursor-pointer px-4 py-2 text-sm`}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 rounded-sm border border-zinc-300 border-l-4 bg-white p-4 transition-all duration-200 sm:px-5 ${
        service.active
          ? 'border-l-brass shadow-2xs hover:-translate-y-0.5 hover:shadow-sm'
          : 'border-l-zinc-400 bg-zinc-100/70 opacity-70'
      }`}
    >
      <div className="space-y-1.5">
        <p className="text-base font-bold text-zinc-900">{service.name}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-sm bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
            {formatDuration(service.durationMinutes)}
          </span>
          <span className="text-zinc-300" aria-hidden="true">
            •
          </span>
          <span className="font-bold text-zinc-900 tabular-nums">
            {formatPrice(service.priceCents)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${
            service.active
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-zinc-300 bg-zinc-200/70 text-zinc-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              service.active ? 'bg-emerald-600' : 'bg-zinc-500'
            }`}
            aria-hidden="true"
          />
          {service.active ? 'Ativo' : 'Inativo'}
        </span>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${buttonSecondary} cursor-pointer px-3.5 py-1.5 text-sm`}
        >
          Editar
        </button>

        <button
          type="button"
          onClick={toggle}
          disabled={toggling}
          className={`${buttonSecondary} cursor-pointer px-3.5 py-1.5 text-sm`}
        >
          {toggling
            ? 'Atualizando...'
            : service.active
              ? 'Desativar'
              : 'Ativar'}
        </button>
      </div>

      {toggleError && (
        <p
          role="alert"
          className="w-full rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {toggleError}
        </p>
      )}
    </div>
  );
}