import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { buttonPrimary } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { AppointmentListItem } from '@/lib/booking-types';
import { capitalizeFirst, formatDateTime, formatPrice } from '@/lib/format';
import { getSession } from '@/lib/session';
import { loadTenant } from '@/lib/tenant';
import { CancelButton } from './cancel-button';

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function AppointmentCard({
  item,
  timezone,
  isUpcoming,
  children,
}: {
  item: AppointmentListItem;
  timezone: string;
  isUpcoming?: boolean;
  children: React.ReactNode;
}) {
  const isCancelled = item.status === 'cancelled';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-4 rounded-sm border border-zinc-300 border-l-4 bg-white p-4 transition-all duration-200 sm:px-5 ${
        isUpcoming
          ? 'border-l-brass shadow-2xs hover:-translate-y-0.5 hover:shadow-sm'
          : isCancelled
            ? 'border-l-zinc-300 bg-zinc-100/70 opacity-75'
            : 'border-l-zinc-400 bg-zinc-50/80'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-wider ${
            isUpcoming
              ? 'bg-zinc-900 text-zinc-50 ring-2 ring-brass/40'
              : 'bg-zinc-200 text-zinc-700'
          }`}
          aria-hidden="true"
        >
          {getInitials(item.barberName)}
        </span>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-zinc-900">
              {item.serviceName}
            </p>
            <span className="text-xs font-medium text-zinc-500">
              com <strong className="font-semibold text-zinc-700">{item.barberName}</strong>
            </span>
          </div>

          <p className="text-sm font-medium text-zinc-700">
            {capitalizeFirst(formatDateTime(item.startsAt, timezone))}
          </p>

          <p className="text-sm font-bold text-zinc-900 tabular-nums">
            {formatPrice(item.priceCents)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold tracking-wide text-red-700 uppercase">
        Cancelado
      </span>
    );
  }

  if (status === 'no_show') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-sm border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold tracking-wide text-amber-800 uppercase">
        Faltou
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs font-bold tracking-wide text-zinc-700 uppercase">
      Realizado
    </span>
  );
}

type PageParams = { params: Promise<{ slug: string }> };

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function MyAppointmentsPage({ params }: PageParams) {
  return (
    <Suspense fallback={<MyAppointmentsSkeleton />}>
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
      {/* Navegação superior */}
      <div className="animate-fade-up space-y-4">
        <Link
          href={`/b/${slug}`}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:text-zinc-900"
        >
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-200 group-hover:-translate-x-1"
          >
            &larr;
          </span>
          <span>Voltar para {tenant.name}</span>
        </Link>

        {/* Cabeçalho principal */}
        <div className="brass-card flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-brass uppercase">
              {tenant.name}
            </p>
            <h1 className="mt-0.5 text-2xl text-zinc-900 sm:text-3xl">
              Meus agendamentos
            </h1>
          </div>

          <Link
            href={`/b/${slug}/agendar`}
            className={`${buttonPrimary} shadow-sm transition-transform active:scale-[0.98]`}
          >
            + Novo agendamento
          </Link>
        </div>
      </div>

      {/* Próximos agendamentos */}
      <section className="animate-fade-up delay-100 space-y-3.5">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
            Próximos ({upcoming.length})
          </h2>
          <div className="h-px flex-1 bg-zinc-300" aria-hidden="true" />
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-sm border border-dashed border-zinc-300 bg-white/80 p-8 text-center">
            <p className="font-display text-lg text-zinc-900">
              Nenhum horário marcado
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
              Você ainda não tem agendamentos futuros em {tenant.name}.
            </p>
            <div className="mt-4">
              <Link href={`/b/${slug}/agendar`} className={buttonPrimary}>
                Agendar agora
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                timezone={tenant.timezone}
                isUpcoming
              >
                <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold tracking-wide text-emerald-800 uppercase">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-600"
                    aria-hidden="true"
                  />
                  Confirmado
                </span>
                <CancelButton slug={slug} appointmentId={item.id} />
              </AppointmentCard>
            ))}
          </div>
        )}
      </section>

      {/* Histórico */}
      {history.length > 0 && (
        <section className="animate-fade-up delay-200 space-y-3.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
              Histórico ({history.length})
            </h2>
            <div className="h-px flex-1 bg-zinc-300" aria-hidden="true" />
          </div>

          <div className="space-y-2.5">
            {history.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                timezone={tenant.timezone}
              >
                <StatusBadge status={item.status} />
              </AppointmentCard>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function MyAppointmentsSkeleton() {
  return (
    <section
      className="space-y-8"
      aria-busy="true"
      aria-label="Carregando seus agendamentos"
    >
      <div className="space-y-4 animate-pulse">
        <div className="h-4 w-36 rounded-sm bg-zinc-200" />
        <div className="h-24 w-full rounded-sm border border-zinc-200 bg-white" />
      </div>

      <div className="overflow-hidden rounded-sm border border-zinc-300 bg-white">
        <div className="pole-stripe pole-stripe-loading" aria-hidden="true" />
        <div className="space-y-3 p-5 animate-pulse">
          <div className="h-20 rounded-sm bg-zinc-100" />
          <div className="h-20 rounded-sm bg-zinc-100" />
        </div>
      </div>
    </section>
  );
}