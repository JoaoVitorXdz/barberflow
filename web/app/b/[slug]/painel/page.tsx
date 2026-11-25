import Link from 'next/link';
import { Suspense } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { buttonSecondary, inputClass } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { AppointmentListItem } from '@/lib/booking-types';
import {
  capitalizeFirst,
  formatLongDate,
  formatPrice,
  formatTime,
  isFuture,
  shiftDate,
  todayIn,
} from '@/lib/format';
import { requireStaff } from '@/lib/staff';
import { loadTenant } from '@/lib/tenant';
import { PanelCancelButton } from './cancel-appointment-button';
import { PanelNav } from './panel-nav';

interface AgendaProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ data?: string }>;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function AgendaPage(props: AgendaProps) {
  return (
    <Suspense fallback={<AgendaSkeleton />}>
      <Agenda {...props} />
    </Suspense>
  );
}

async function Agenda({ params, searchParams }: AgendaProps) {
  const { slug } = await params;
  const { data } = await searchParams;

  const session = await requireStaff(slug);
  const tenant = await loadTenant(slug);

  const today = todayIn(tenant.timezone);
  const date = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : today;
  const isToday = date === today;

  const appointments = await apiFetch<AppointmentListItem[]>(
    `/appointments?date=${date}`,
  );

  const canCancel = session.role === 'owner' || session.role === 'receptionist';

  // Agrupa por barbeiro, mantendo a ordem por horário que a API já entrega
  const byBarber = new Map<string, { name: string; items: AppointmentListItem[] }>();
  for (const item of appointments) {
    const group = byBarber.get(item.barberId) ?? {
      name: item.barberName,
      items: [],
    };
    group.items.push(item);
    byBarber.set(item.barberId, group);
  }

  const active = appointments.filter((item) => item.status === 'scheduled');
  const cancelledCount = appointments.length - active.length;
  const revenue = active.reduce((sum, item) => sum + item.priceCents, 0);

  return (
    <section className="space-y-8">
      <PanelNav
        slug={slug}
        tenantName={tenant.name}
        role={session.role}
        active="agenda"
      />

      {/* Cabeçalho e controles de data */}
      <div className="animate-fade-up space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl">Agenda</h1>
              {isToday && (
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-brass/50 bg-white px-2.5 py-0.5 text-xs font-bold tracking-wider text-zinc-900 uppercase shadow-2xs">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-600"
                    aria-hidden="true"
                  />
                  Hoje
                </span>
              )}
            </div>
            <p className="text-base font-medium text-zinc-700">
              {capitalizeFirst(formatLongDate(date))}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/b/${slug}/painel?data=${shiftDate(date, -1)}`}
              className={`${buttonSecondary} px-3.5 py-2 text-sm`}
            >
              &larr; Anterior
            </Link>
            <Link
              href={`/b/${slug}/painel`}
              className={`${buttonSecondary} px-3.5 py-2 text-sm ${
                isToday ? 'border-zinc-900 bg-zinc-200/70' : ''
              }`}
            >
              Hoje
            </Link>
            <Link
              href={`/b/${slug}/painel?data=${shiftDate(date, 1)}`}
              className={`${buttonSecondary} px-3.5 py-2 text-sm`}
            >
              Próximo &rarr;
            </Link>
          </div>
        </div>

        {/* Barra de salto direto para data */}
        <form className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-zinc-300/90 bg-white px-4 py-3 shadow-2xs">
          <label
            htmlFor="agenda-date"
            className="text-xs font-bold tracking-wider text-zinc-600 uppercase"
          >
            Navegar para data específica
          </label>
          <div className="flex items-center gap-2">
            <input
              id="agenda-date"
              type="date"
              name="data"
              defaultValue={date}
              className={`${inputClass} w-auto py-1.5 text-sm font-medium`}
            />
            <button
              type="submit"
              className={`${buttonSecondary} cursor-pointer px-4 py-1.5 text-sm`}
            >
              Ir
            </button>
          </div>
        </form>
      </div>

      {/* Cards de KPIs do dia */}
      <div className="animate-fade-up delay-100 grid gap-4 sm:grid-cols-3">
        <div className="brass-card p-5">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Agendamentos ativos
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-3xl font-extrabold text-zinc-900 tabular-nums">
              {active.length}
            </span>
            {cancelledCount > 0 && (
              <span className="text-xs font-medium text-zinc-500">
                {cancelledCount}{' '}
                {cancelledCount === 1 ? 'cancelado' : 'cancelados'}
              </span>
            )}
          </div>
        </div>

        <div className="brass-card p-5">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Previsto no dia
          </p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-900 tabular-nums">
            {formatPrice(revenue)}
          </p>
        </div>

        <div className="brass-card p-5">
          <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
            Profissionais na escala
          </p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-900 tabular-nums">
            {byBarber.size}
          </p>
        </div>
      </div>

      {/* Lista de agendamentos agrupada por barbeiro */}
      <div className="animate-fade-up delay-200 space-y-8">
        {appointments.length === 0 ? (
          <div className="rounded-sm border border-dashed border-zinc-300 bg-white/80 p-10 text-center">
            <p className="font-display text-lg text-zinc-800">
              Agenda livre neste dia
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Nenhum horário marcado para{' '}
              <span className="lowercase">{formatLongDate(date)}</span>.
            </p>
          </div>
        ) : (
          [...byBarber.entries()].map(([barberId, group]) => {
            const barberActiveCount = group.items.filter(
              (i) => i.status === 'scheduled',
            ).length;

            return (
              <section key={barberId} className="space-y-3">
                {/* Cabeçalho do Barbeiro */}
                <div className="flex items-center justify-between gap-3 border-b border-zinc-300 pb-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold tracking-wider text-zinc-50 ring-2 ring-brass/50"
                      aria-hidden="true"
                    >
                      {getInitials(group.name)}
                    </span>
                    <h2 className="text-lg font-bold text-zinc-900">
                      {group.name}
                    </h2>
                  </div>

                  <span className="rounded-sm bg-zinc-200/80 px-2.5 py-0.5 text-xs font-bold text-zinc-700">
                    {barberActiveCount}{' '}
                    {barberActiveCount === 1 ? 'horário' : 'horários'}
                  </span>
                </div>

                {/* Cards de cada atendimento */}
                <div className="space-y-2.5">
                  {group.items.map((item) => {
                    const isCancelled = item.status === 'cancelled';

                    return (
                      <div
                        key={item.id}
                        className={`flex flex-wrap items-center justify-between gap-4 rounded-sm border border-zinc-300 border-l-4 bg-white p-4 transition-all duration-200 sm:px-5 ${
                          isCancelled
                            ? 'border-l-zinc-400 bg-zinc-100/70 opacity-65'
                            : 'border-l-brass shadow-2xs hover:-translate-y-0.5 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Bloco de horário */}
                          <div
                            className={`rounded-sm px-3 py-2 text-center tabular-nums ${
                              isCancelled
                                ? 'bg-zinc-200 text-zinc-600'
                                : 'bg-zinc-900 text-zinc-50'
                            }`}
                          >
                            <span className="block text-base leading-none font-bold">
                              {formatTime(item.startsAt, tenant.timezone)}
                            </span>
                            <span className="mt-1 block text-[11px] leading-none text-zinc-400">
                              até {formatTime(item.endsAt, tenant.timezone)}
                            </span>
                          </div>

                          {/* Detalhes do serviço e cliente */}
                          <div className="space-y-0.5">
                            <p className="text-base font-bold text-zinc-900">
                              {item.serviceName}
                            </p>
                            <p className="text-sm text-zinc-600">
                              <span className="font-medium text-zinc-800">
                                {item.customerName}
                              </span>
                              {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Preço, status e ação */}
                        <div className="flex flex-wrap items-center gap-3.5 sm:gap-4">
                          <span className="text-base font-bold text-zinc-900 tabular-nums">
                            {formatPrice(item.priceCents)}
                          </span>
                          <StatusBadge status={item.status} />
                          {canCancel &&
                            item.status === 'scheduled' &&
                            isFuture(item.startsAt) && (
                              <PanelCancelButton
                                slug={slug}
                                appointmentId={item.id}
                              />
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}

function AgendaSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Carregando agenda">
      {/* Barra superior */}
      <div className="h-12 w-full animate-pulse rounded-sm bg-zinc-200" />

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-36 rounded-sm bg-zinc-200" />
          <div className="h-4 w-52 rounded-sm bg-zinc-200" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-sm bg-zinc-200" />
          <div className="h-9 w-16 rounded-sm bg-zinc-200" />
          <div className="h-9 w-24 rounded-sm bg-zinc-200" />
        </div>
      </div>

      {/* Skeleton dos 3 KPIs */}
      <div className="grid gap-4 sm:grid-cols-3 animate-pulse">
        <div className="h-24 rounded-sm border border-zinc-200 bg-white p-5" />
        <div className="h-24 rounded-sm border border-zinc-200 bg-white p-5" />
        <div className="h-24 rounded-sm border border-zinc-200 bg-white p-5" />
      </div>

      {/* Lista com faixa animada do Barber Pole */}
      <div className="overflow-hidden rounded-sm border border-zinc-300 bg-white">
        <div className="pole-stripe pole-stripe-loading" aria-hidden="true" />
        <div className="space-y-3 p-5 animate-pulse">
          <div className="h-16 rounded-sm bg-zinc-100" />
          <div className="h-16 rounded-sm bg-zinc-100" />
          <div className="h-16 rounded-sm bg-zinc-100" />
        </div>
      </div>
    </section>
  );
}