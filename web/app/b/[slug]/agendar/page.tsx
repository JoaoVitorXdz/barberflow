import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { BarberItem, ServiceItem } from '@/lib/booking-types';
import { getSession } from '@/lib/session';
import { loadTenant } from '@/lib/tenant';
import { BookingWizard } from './booking-wizard';

export default function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<BookingSkeleton />}>
      <BookContent params={params} />
    </Suspense>
  );
}

async function BookContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await getSession(slug);
  if (!session) {
    redirect(`/b/${slug}/entrar`);
  }
  if (session.role !== 'customer') {
    redirect(`/b/${slug}`);
  }

  const [tenant, services, barbers] = await Promise.all([
    loadTenant(slug),
    apiFetch<ServiceItem[]>('/services'),
    apiFetch<BarberItem[]>('/barbers'),
  ]);

  // "Hoje" no fuso da barbearia, no formato AAAA-MM-DD
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: tenant.timezone,
  }).format(new Date());

  return (
    <section className="space-y-8">
      {/* Navegação superior discreta */}
      <div className="animate-fade-up flex items-center justify-between gap-4">
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

        <span className="inline-flex items-center gap-1.5 rounded-sm border border-brass/40 bg-white px-2.5 py-1 text-xs font-bold tracking-wider text-zinc-800 uppercase shadow-2xs">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-600"
            aria-hidden="true"
          />
          Agenda aberta
        </span>
      </div>

      {/* Placa de esmalte da barbearia */}
      <header className="animate-fade-up delay-100 sign shadow-md">
        <p className="text-xs font-bold tracking-[0.2em] text-brass uppercase">
          {tenant.name}
        </p>
        <h1 className="mt-1.5 text-2xl text-zinc-50 sm:text-3xl">
          Agendar horário
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-300">
          Escolha o serviço, o profissional de sua preferência e o melhor
          horário disponível.
        </p>
      </header>

      {/* Wizard de agendamento */}
      <div className="animate-fade-up delay-200">
        <BookingWizard
          slug={slug}
          services={services}
          barbers={barbers.filter((barber) => barber.active)}
          minDate={today}
        />
      </div>
    </section>
  );
}

function BookingSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="Carregando agendamento">
      {/* Barra superior */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-36 animate-pulse rounded-sm bg-zinc-200" />
        <div className="h-6 w-28 animate-pulse rounded-sm bg-zinc-200" />
      </div>

      {/* Skeleton da placa */}
      <div className="overflow-hidden rounded-sm border border-zinc-300 bg-zinc-900/95 p-8">
        <div className="mx-auto flex max-w-sm flex-col items-center space-y-3 animate-pulse">
          <div className="h-3 w-24 rounded-sm bg-zinc-700" />
          <div className="h-7 w-48 rounded-sm bg-zinc-700" />
          <div className="h-4 w-64 rounded-sm bg-zinc-800" />
        </div>
      </div>

      {/* Skeleton do wizard com a faixa animada do Barber Pole */}
      <div className="overflow-hidden rounded-sm border border-zinc-300 bg-white shadow-sm">
        <div className="pole-stripe pole-stripe-loading" aria-hidden="true" />
        <div className="space-y-5 p-6 animate-pulse">
          <div className="h-5 w-44 rounded-sm bg-zinc-200" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-20 rounded-sm bg-zinc-100" />
            <div className="h-20 rounded-sm bg-zinc-100" />
            <div className="h-20 rounded-sm bg-zinc-100" />
            <div className="h-20 rounded-sm bg-zinc-100" />
          </div>
        </div>
      </div>
    </section>
  );
}