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
    <section className="space-y-6">
      <div className="space-y-1">
        <Link
          href={`/b/${slug}`}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          ← {tenant.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Agendar horário</h1>
      </div>

      <BookingWizard
        slug={slug}
        services={services}
        barbers={barbers.filter((barber) => barber.active)}
        minDate={today}
      />
    </section>
  );
}

function BookingSkeleton() {
  return (
    <section className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-64 w-full rounded-lg bg-zinc-100 dark:bg-zinc-900" />
    </section>
  );
}