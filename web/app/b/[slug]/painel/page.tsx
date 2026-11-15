import Link from 'next/link';
import { Suspense } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { buttonSecondary, card } from '@/components/ui';
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

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function AgendaPage(props: AgendaProps) {
  return (
    <Suspense
      fallback={<p className="text-sm text-zinc-500">Carregando a agenda...</p>}
    >
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
  const revenue = active.reduce((sum, item) => sum + item.priceCents, 0);

  return (
    <section className="space-y-6">
      <PanelNav
        slug={slug}
        tenantName={tenant.name}
        role={session.role}
        active="agenda"
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
            <p className="text-zinc-600">{capitalizeFirst(formatLongDate(date))}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/b/${slug}/painel?data=${shiftDate(date, -1)}`}
              className={buttonSecondary}
            >
              ← Dia anterior
            </Link>
            <Link href={`/b/${slug}/painel`} className={buttonSecondary}>
              Hoje
            </Link>
            <Link
              href={`/b/${slug}/painel?data=${shiftDate(date, 1)}`}
              className={buttonSecondary}
            >
              Próximo dia →
            </Link>
          </div>
        </div>

        <form className="flex items-end gap-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Ir para o dia</span>
            <input
              type="date"
              name="data"
              defaultValue={date}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 outline-none focus:border-zinc-900"
            />
          </label>
          <button type="submit" className={buttonSecondary}>
            Ir
          </button>
        </form>
      </div>

      <div className={`${card} flex flex-wrap gap-x-8 gap-y-2`}>
        <p>
          <span className="text-2xl font-bold">{active.length}</span>{' '}
          <span className="text-sm text-zinc-600">
            {active.length === 1 ? 'agendamento' : 'agendamentos'}
          </span>
        </p>
        <p>
          <span className="text-2xl font-bold">{formatPrice(revenue)}</span>{' '}
          <span className="text-sm text-zinc-600">previstos no dia</span>
        </p>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-zinc-600">Nenhum agendamento neste dia.</p>
      ) : (
        [...byBarber.entries()].map(([barberId, group]) => (
          <section key={barberId} className="space-y-3">
            <h2 className="text-lg font-semibold">{group.name}</h2>
            {group.items.map((item) => (
              <div
                key={item.id}
                className={`${card} flex flex-wrap items-center justify-between gap-4 ${
                  item.status === 'cancelled' ? 'opacity-60' : ''
                }`}
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {formatTime(item.startsAt, tenant.timezone)}–
                    {formatTime(item.endsAt, tenant.timezone)} · {item.serviceName}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {item.customerName}
                    {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatPrice(item.priceCents)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  {canCancel &&
                    item.status === 'scheduled' &&
                    isFuture(item.startsAt) && (
                      <PanelCancelButton slug={slug} appointmentId={item.id} />
                    )}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </section>
  );
}