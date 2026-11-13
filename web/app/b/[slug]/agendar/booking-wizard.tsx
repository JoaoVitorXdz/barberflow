'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { buttonPrimary, buttonSecondary, card } from '@/components/ui';
import type {
  BarberItem,
  BookingResult,
  ServiceItem,
  SlotItem,
} from '@/lib/booking-types';
import { formatDuration, formatLongDate, formatPrice } from '@/lib/format';
import { bookAction, loadSlotsAction } from './actions';

interface BookingWizardProps {
  slug: string;
  services: ServiceItem[];
  barbers: BarberItem[];
  minDate: string;
}

function choiceClass(selected: boolean): string {
  return `w-full rounded-lg border p-4 text-left transition ${
    selected
      ? 'border-zinc-900 bg-zinc-900 text-white'
      : 'border-zinc-200 bg-white hover:border-zinc-400'
  }`;
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-sm text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function BookingWizard({
  slug,
  services,
  barbers,
  minDate,
}: BookingWizardProps) {
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<SlotItem[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selected, setSelected] = useState<SlotItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  // Conta as buscas: só a mais recente pode atualizar a tela.
  const latestRequest = useRef(0);

  const service = services.find((item) => item.id === serviceId) ?? null;
  const barber = barbers.find((item) => item.id === barberId) ?? null;
  const availableBarbers = service
    ? barbers.filter((item) => item.services.some((s) => s.id === service.id))
    : [];

  async function fetchSlots(
    nextBarberId: string,
    nextServiceId: string,
    nextDate: string,
  ) {
    const requestId = ++latestRequest.current;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelected(null);

    const response = await loadSlotsAction(nextBarberId, nextServiceId, nextDate);
    if (requestId !== latestRequest.current) {
      return; // chegou depois de uma busca mais nova: descarta
    }

    setSlots(response.slots);
    setSlotsError(response.error ?? null);
    setLoadingSlots(false);
  }

  function chooseService(id: string) {
    latestRequest.current++; // descarta buscas pendentes
    setServiceId(id);
    setBarberId(null);
    setSlots(null);
    setSlotsError(null);
    setLoadingSlots(false);
    setSelected(null);
    setResult(null);
  }

  function chooseBarber(id: string) {
    setBarberId(id);
    setResult(null);
    if (serviceId) {
      void fetchSlots(id, serviceId, date);
    }
  }

  function changeDate(value: string) {
    setDate(value);
    setResult(null);
    if (barberId && serviceId && value) {
      void fetchSlots(barberId, serviceId, value);
    }
  }

  async function confirm() {
    if (!service || !barber || !selected) return;

    setSubmitting(true);
    const response = await bookAction(barber.id, service.id, selected.startsAt);
    setSubmitting(false);
    setResult(response);

    if (!response.ok) {
      // Ex.: outro cliente pegou o horário. Atualiza a lista para escolher outro.
      void fetchSlots(barber.id, service.id, date);
    }
  }

  function reset() {
    latestRequest.current++;
    setServiceId(null);
    setBarberId(null);
    setDate(minDate);
    setSlots(null);
    setSlotsError(null);
    setLoadingSlots(false);
    setSelected(null);
    setResult(null);
  }

  if (result?.ok && service && barber && selected) {
    return (
      <div className={`${card} space-y-5`}>
        <h2 className="text-xl font-semibold">Agendamento confirmado ✅</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-zinc-500">Serviço</dt>
          <dd>{service.name}</dd>
          <dt className="text-zinc-500">Barbeiro</dt>
          <dd>{barber.displayName}</dd>
          <dt className="text-zinc-500">Quando</dt>
          <dd>
            <span className="capitalize">{formatLongDate(date)}</span> às{' '}
            {selected.localTime}
          </dd>
          <dt className="text-zinc-500">Valor</dt>
          <dd>{formatPrice(service.priceCents)}</dd>
        </dl>
        <p className="text-sm text-zinc-600">
          Você receberá uma confirmação e um lembrete antes do horário.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={`/b/${slug}/meus-agendamentos`} className={buttonPrimary}>
            Meus agendamentos
          </Link>
          <button type="button" onClick={reset} className={buttonSecondary}>
            Agendar outro horário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Step number={1} title="Escolha o serviço">
        {services.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Esta barbearia ainda não cadastrou serviços.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === serviceId}
                onClick={() => chooseService(item.id)}
                className={choiceClass(item.id === serviceId)}
              >
                <span className="block font-medium">{item.name}</span>
                <span className="block text-sm opacity-80">
                  {formatDuration(item.durationMinutes)} ·{' '}
                  {formatPrice(item.priceCents)}
                </span>
              </button>
            ))}
          </div>
        )}
      </Step>

      {service && (
        <Step number={2} title="Escolha o barbeiro">
          {availableBarbers.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Nenhum barbeiro realiza este serviço no momento.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableBarbers.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === barberId}
                  onClick={() => chooseBarber(item.id)}
                  className={choiceClass(item.id === barberId)}
                >
                  <span className="block font-medium">{item.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </Step>
      )}

      {service && barber && (
        <Step number={3} title="Escolha o dia e o horário">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Dia</span>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(event) => changeDate(event.target.value)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>

          {loadingSlots && (
            <p className="text-sm text-zinc-500">Buscando horários...</p>
          )}
          {!loadingSlots && slotsError && (
            <p role="alert" className="text-sm text-red-600">
              {slotsError}
            </p>
          )}
          {!loadingSlots && !slotsError && slots && slots.length === 0 && (
            <p className="text-sm text-zinc-600">
              Sem horários livres neste dia. Tente outra data.
            </p>
          )}
          {!loadingSlots && slots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.startsAt}
                  type="button"
                  aria-pressed={selected?.startsAt === slot.startsAt}
                  onClick={() => {
                    setSelected(slot);
                    setResult(null);
                  }}
                  className={`rounded-md border px-3 py-2 text-sm transition ${
                    selected?.startsAt === slot.startsAt
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white hover:border-zinc-400'
                  }`}
                >
                  {slot.localTime}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <div className={`${card} space-y-4`}>
              <p>
                <span className="font-medium">{service.name}</span> com{' '}
                <span className="font-medium">{barber.displayName}</span>,{' '}
                <span className="capitalize">{formatLongDate(date)}</span> às{' '}
                <span className="font-medium">{selected.localTime}</span> ·{' '}
                {formatPrice(service.priceCents)}
              </p>
              {result && !result.ok && (
                <p role="alert" className="text-sm text-red-600">
                  {result.error}
                </p>
              )}
              <button
                type="button"
                onClick={confirm}
                disabled={submitting}
                className={buttonPrimary}
              >
                {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
              </button>
            </div>
          )}

          {!selected && result && !result.ok && (
            <p role="alert" className="text-sm text-red-600">
              {result.error}
            </p>
          )}
        </Step>
      )}
    </div>
  );
}