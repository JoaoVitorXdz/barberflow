'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { buttonPrimary, buttonSecondary, inputClass } from '@/components/ui';
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

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function Step({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="animate-fade-up space-y-4 rounded-sm border border-zinc-300/90 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex items-start gap-3 border-b border-zinc-200/80 pb-3.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-zinc-900 text-xs font-bold text-zinc-50 ring-2 ring-brass/40">
          {number}
        </span>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-zinc-600">{subtitle}</p>
          )}
        </div>
      </div>
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
      <div className="animate-fade-up brass-card overflow-hidden">
        <div className="pole-stripe" aria-hidden="true" />
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
                Horário reservado
              </span>
              <h2 className="font-display text-2xl text-zinc-900">
                Agendamento confirmado
              </h2>
            </div>
          </div>

          {/* Comprovante estilo ticket */}
          <dl className="divide-y divide-dashed divide-zinc-300 rounded-sm border border-zinc-200 bg-zinc-50/90 px-4 py-1 text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-zinc-500">Serviço</dt>
              <dd className="font-bold text-zinc-900">{service.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-zinc-500">Profissional</dt>
              <dd className="font-bold text-zinc-900">{barber.displayName}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-zinc-500">Data e hora</dt>
              <dd className="text-right font-bold text-zinc-900">
                <span className="capitalize">{formatLongDate(date)}</span> às{' '}
                <span className="rounded-sm bg-zinc-900 px-2 py-0.5 text-zinc-50 tabular-nums">
                  {selected.localTime}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="font-medium text-zinc-500">Valor</dt>
              <dd className="text-base font-extrabold text-zinc-900 tabular-nums">
                {formatPrice(service.priceCents)}
              </dd>
            </div>
          </dl>

          <p className="text-sm text-zinc-600">
            Você receberá uma confirmação e um lembrete antes do seu horário.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link href={`/b/${slug}/meus-agendamentos`} className={buttonPrimary}>
              Meus agendamentos
            </Link>
            <button
              type="button"
              onClick={reset}
              className={`${buttonSecondary} cursor-pointer`}
            >
              Agendar outro horário
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Passo 1: Serviços */}
      <Step
        number={1}
        title="Escolha o serviço"
        subtitle="Selecione o atendimento desejado para ver os profissionais disponíveis"
      >
        {services.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Esta barbearia ainda não cadastrou serviços.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {services.map((item) => {
              const isSelected = item.id === serviceId;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => chooseService(item.id)}
                  className={`group relative flex cursor-pointer flex-col justify-between rounded-sm border-2 p-4 text-left transition-all duration-200 active:scale-[0.99] ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-900 text-zinc-50 shadow-md'
                      : 'border-zinc-200 bg-zinc-50/50 hover:-translate-y-0.5 hover:border-brass hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold tracking-tight">{item.name}</span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isSelected
                          ? 'border-brass bg-brass text-zinc-950'
                          : 'border-zinc-300 bg-white group-hover:border-brass'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </span>
                  </div>

                  {/* Linha pontilhada estilo menu de barbearia */}
                  <div className="mt-3 flex items-baseline gap-2 text-sm">
                    <span
                      className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${
                        isSelected
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-zinc-200/70 text-zinc-700'
                      }`}
                    >
                      {formatDuration(item.durationMinutes)}
                    </span>
                    <span
                      className={`flex-1 border-b border-dotted ${
                        isSelected ? 'border-zinc-700' : 'border-zinc-300'
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-base font-bold tabular-nums ${
                        isSelected ? 'text-[#e5c16c]' : 'text-zinc-900'
                      }`}
                    >
                      {formatPrice(item.priceCents)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Step>

      {/* Passo 2: Barbeiro */}
      {service && (
        <Step
          number={2}
          title="Escolha o barbeiro"
          subtitle={`Profissionais que realizam ${service.name}`}
        >
          {availableBarbers.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Nenhum barbeiro realiza este serviço no momento.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {availableBarbers.map((item) => {
                const isSelected = item.id === barberId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => chooseBarber(item.id)}
                    className={`group flex cursor-pointer items-center justify-between gap-3 rounded-sm border-2 p-3.5 text-left transition-all duration-200 active:scale-[0.99] ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-zinc-50 shadow-md'
                        : 'border-zinc-200 bg-zinc-50/50 hover:-translate-y-0.5 hover:border-brass hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold tracking-wider transition-colors ${
                          isSelected
                            ? 'bg-brass text-zinc-950'
                            : 'bg-zinc-900 text-zinc-50 group-hover:bg-zinc-800'
                        }`}
                        aria-hidden="true"
                      >
                        {getInitials(item.displayName)}
                      </span>
                      <div>
                        <span className="block font-bold">
                          {item.displayName}
                        </span>
                        <span
                          className={`text-xs ${
                            isSelected ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          Barbeiro disponível
                        </span>
                      </div>
                    </div>

                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isSelected
                          ? 'border-brass bg-brass text-zinc-950'
                          : 'border-zinc-300 bg-white group-hover:border-brass'
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={3}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Step>
      )}

      {/* Passo 3: Dia e Horário */}
      {service && barber && (
        <Step
          number={3}
          title="Escolha o dia e o horário"
          subtitle={`Agenda livre de ${barber.displayName}`}
        >
          <div className="space-y-5">
            <label className="block max-w-xs space-y-1.5">
              <span className="block text-sm font-bold text-zinc-900">
                Data do atendimento
              </span>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(event) => changeDate(event.target.value)}
                className={`${inputClass} cursor-pointer font-medium`}
              />
            </label>

            {loadingSlots && (
              <div
                role="status"
                className="max-w-sm space-y-2.5 rounded-sm border border-zinc-200 bg-zinc-50 p-4"
              >
                <p className="text-sm font-medium text-zinc-700">
                  Consultando horários livres...
                </p>
                <div
                  className="pole-stripe pole-stripe-loading rounded-xs"
                  aria-hidden="true"
                />
              </div>
            )}

            {!loadingSlots && slotsError && (
              <p
                role="alert"
                className="rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
              >
                {slotsError}
              </p>
            )}

            {!loadingSlots && !slotsError && slots && slots.length === 0 && (
              <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                Sem horários livres nesta data. Selecione outro dia acima.
              </div>
            )}

            {!loadingSlots && slots && slots.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  <span>Horários disponíveis ({slots.length})</span>
                  <span>Duração: {formatDuration(service.durationMinutes)}</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {slots.map((slot) => {
                    const isSlotSelected = selected?.startsAt === slot.startsAt;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        aria-pressed={isSlotSelected}
                        onClick={() => {
                          setSelected(slot);
                          setResult(null);
                        }}
                        className={`cursor-pointer rounded-sm border-2 px-3 py-2.5 text-base font-bold tabular-nums transition-all duration-150 active:scale-[0.96] ${
                          isSlotSelected
                            ? 'border-brass bg-zinc-900 text-zinc-50 shadow-sm ring-2 ring-zinc-900/20'
                            : 'border-zinc-300 bg-white text-zinc-900 hover:-translate-y-0.5 hover:border-brass hover:bg-zinc-50'
                        }`}
                      >
                        {slot.localTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resumo final antes de confirmar */}
            {selected && (
              <div className="animate-fade-up brass-card space-y-5 bg-zinc-50/70 p-5 sm:p-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold tracking-wider text-brass uppercase">
                    Resumo da reserva
                  </span>
                  <p className="text-lg leading-snug text-zinc-900">
                    <span className="font-bold">{service.name}</span> com{' '}
                    <span className="font-bold">{barber.displayName}</span>,{' '}
                    <span className="capitalize">{formatLongDate(date)}</span>, às{' '}
                    <span className="rounded-sm bg-zinc-900 px-2 py-0.5 font-bold text-zinc-50 tabular-nums">
                      {selected.localTime}
                    </span>
                    . Valor:{' '}
                    <span className="font-bold tabular-nums">
                      {formatPrice(service.priceCents)}
                    </span>
                    .
                  </p>
                </div>

                {result && !result.ok && (
                  <p
                    role="alert"
                    className="rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
                  >
                    {result.error}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={submitting}
                    className={`${buttonPrimary} cursor-pointer shadow-sm transition-transform active:scale-[0.98]`}
                  >
                    {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
                  </button>
                  <span className="text-xs text-zinc-500">
                    Reserva imediata na agenda do barbeiro
                  </span>
                </div>
              </div>
            )}

            {!selected && result && !result.ok && (
              <p
                role="alert"
                className="rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
              >
                {result.error}
              </p>
            )}
          </div>
        </Step>
      )}
    </div>
  );
}