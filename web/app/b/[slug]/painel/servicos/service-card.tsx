'use client';

import { useActionState, useState, useTransition } from 'react';
import { buttonPrimary, buttonSecondary, card } from '@/components/ui';
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
      <form action={formAction} className={`${card} space-y-4`}>
        <ServiceFields
          defaults={{
            name: service.name,
            duration: String(service.durationMinutes),
            price: centsToInput(service.priceCents),
          }}
        />
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className={buttonPrimary}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className={buttonSecondary}
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={`${card} flex flex-wrap items-center justify-between gap-4 ${
        service.active ? '' : 'opacity-60'
      }`}
    >
      <div className="space-y-1">
        <p className="font-medium">{service.name}</p>
        <p className="text-sm text-zinc-600">
          {formatDuration(service.durationMinutes)} ·{' '}
          {formatPrice(service.priceCents)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            service.active
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-zinc-100 text-zinc-600'
          }`}
        >
          {service.active ? 'Ativo' : 'Inativo'}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={buttonSecondary}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={toggling}
          className={buttonSecondary}
        >
          {service.active ? 'Desativar' : 'Ativar'}
        </button>
      </div>

      {toggleError && (
        <p role="alert" className="w-full text-sm text-red-600">
          {toggleError}
        </p>
      )}
    </div>
  );
}