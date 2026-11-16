import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { apiFetch } from '@/lib/api';
import type { BarberItem, ServiceItem } from '@/lib/booking-types';
import { requireStaff } from '@/lib/staff';
import { loadTenant } from '@/lib/tenant';
import { PanelNav } from '../../panel-nav';
import { BarberActiveButton } from './barber-active-button';
import { BarberServicesForm } from './barber-services-form';

type PageProps = { params: Promise<{ slug: string; barberId: string }> };

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function BarberDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={<p className="text-sm text-zinc-500">Carregando o barbeiro...</p>}
    >
      <BarberDetail params={params} />
    </Suspense>
  );
}

async function BarberDetail({ params }: PageProps) {
  const { slug, barberId } = await params;

  const session = await requireStaff(slug);
  if (session.role !== 'owner') {
    redirect(`/b/${slug}/painel`);
  }

  const [tenant, barbers, services] = await Promise.all([
    loadTenant(slug),
    apiFetch<BarberItem[]>('/barbers'),
    apiFetch<ServiceItem[]>('/services'),
  ]);

  const barber = barbers.find((item) => item.id === barberId);
  if (!barber) {
    notFound();
  }
  const selectedIds = barber.services.map((service) => service.id);

  return (
    <section className="space-y-6">
      <PanelNav
        slug={slug}
        tenantName={tenant.name}
        role={session.role}
        active="barbeiros"
      />

      <div className="space-y-2">
        <Link
          href={`/b/${slug}/painel/barbeiros`}
          className="text-sm text-zinc-500 underline-offset-2 hover:underline"
        >
          ← Barbeiros
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {barber.displayName}
            </h1>
            <p className="text-sm text-zinc-600">{barber.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                barber.active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {barber.active ? 'Ativo' : 'Inativo'}
            </span>
            <BarberActiveButton
              slug={slug}
              barberId={barber.id}
              active={barber.active}
            />
          </div>
        </div>
      </div>

      {/* A key refaz o formulário quando os serviços salvos mudam */}
      <BarberServicesForm
        key={selectedIds.join(',')}
        slug={slug}
        barberId={barber.id}
        services={services}
        selectedIds={selectedIds}
      />
    </section>
  );
}