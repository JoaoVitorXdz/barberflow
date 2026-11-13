import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { buttonPrimary, card } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { AppointmentListItem } from '@/lib/booking-types';
import { capitalizeFirst, formatDateTime, formatPrice } from '@/lib/format';
import { getSession } from '@/lib/session';
import { loadTenant } from '@/lib/tenant';
import { CancelButton } from './cancel-button';

function AppointmentCard({
  item,
  timezone,
  children,
}: {
  item: AppointmentListItem;
  timezone: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
      <div className="space-y-1">
        <p className="font-medium">
          {item.serviceName} com {item.barberName}
        </p>
        <p className="text-sm text-zinc-600">
          {capitalizeFirst(formatDateTime(item.startsAt, timezone))}
        </p>
        <p className="text-sm text-zinc-500">{formatPrice(item.priceCents)}</p>
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cancelled = status === 'cancelled';
  const label = cancelled ? 'Cancelado' : status === 'no_show' ? 'Faltou' : 'Realizado';

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        cancelled ? 'bg-red-50 text-red-700' : 'bg-zinc-100 text-zinc-700'
      }`}
    >
      {label}
    </span>
  );
}

type PageParams = { params: Promise<{ slug: string }> };

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function MyAppointmentsPage({ params }: PageParams) {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500">Carregando seus agendamentos...</p>
      }
    >
      <MyAppointments params={params} />
    </Suspense>
  );
}

async function MyAppointments({ params }: PageParams) {
  const { slug } = await params;

  const session = await getSession(slug);
  if (!session) {
    redirect(`/b/${slug}/entrar`);
  }
  if (session.role !== 'customer') {
    redirect(`/b/${slug}`);
  }

  const [tenant, fromNow, everything] = await Promise.all([
    loadTenant(slug),
    // Sem "from", a API devolve só o que ainda vai acontecer (ou está acontecendo)
    apiFetch<AppointmentListItem[]>('/appointments'),
    apiFetch<AppointmentListItem[]>('/appointments?from=2020-01-01T00:00:00Z'),
  ]);

  const upcoming = fromNow.filter((item) => item.status === 'scheduled');
  const upcomingIds = new Set(upcoming.map((item) => item.id));
  // Do mais recente para o mais antigo
  const history = everything
    .filter((item) => !upcomingIds.has(item.id))
    .reverse();

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <Link
          href={`/b/${slug}`}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          ← {tenant.name}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Meus agendamentos</h1>
          <Link href={`/b/${slug}/agendar`} className={buttonPrimary}>
            Novo agendamento
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Próximos</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Você não tem agendamentos futuros.
          </p>
        ) : (
          upcoming.map((item) => (
            <AppointmentCard key={item.id} item={item} timezone={tenant.timezone}>
              <CancelButton slug={slug} appointmentId={item.id} />
            </AppointmentCard>
          ))
        )}
      </section>

      {history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Histórico</h2>
          {history.map((item) => (
            <AppointmentCard key={item.id} item={item} timezone={tenant.timezone}>
              <StatusBadge status={item.status} />
            </AppointmentCard>
          ))}
        </section>
      )}
    </section>
  );
}