import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { buttonSecondary, card } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { BarberItem, ServiceItem } from '@/lib/booking-types';
import { requireStaff } from '@/lib/staff';
import { loadTenant } from '@/lib/tenant';
import { PanelNav } from '../panel-nav';
import { NewBarberForm } from './new-barber-form';

type PageProps = { params: Promise<{ slug: string }> };

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function BarbersPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={<p className="text-sm text-zinc-500">Carregando os barbeiros...</p>}
    >
      <Barbers params={params} />
    </Suspense>
  );
}

async function Barbers({ params }: PageProps) {
  const { slug } = await params;

  const session = await requireStaff(slug);
  if (session.role !== 'owner') {
    redirect(`/b/${slug}/painel`);
  }

  const [tenant, barbers, services] = await Promise.all([
    loadTenant(slug),
    apiFetch<BarberItem[]>('/barbers'),
    apiFetch<ServiceItem[]>('/services'),
  ]);

  return (
    <section className="space-y-6">
      <PanelNav
        slug={slug}
        tenantName={tenant.name}
        role={session.role}
        active="barbeiros"
      />

      <h1 className="text-2xl font-bold tracking-tight">Barbeiros</h1>

      <NewBarberForm
        slug={slug}
        services={services.filter((service) => service.active)}
      />

      <section className="space-y-3">
        {barbers.length === 0 ? (
          <p className="text-sm text-zinc-600">Nenhum barbeiro cadastrado ainda.</p>
        ) : (
          barbers.map((barber) => (
            <div
              key={barber.id}
              className={`${card} flex flex-wrap items-center justify-between gap-4 ${
                barber.active ? '' : 'opacity-60'
              }`}
            >
              <div className="space-y-1">
                <p className="font-medium">{barber.displayName}</p>
                <p className="text-sm text-zinc-600">{barber.email}</p>
                <p className="text-sm text-zinc-500">
                  {barber.services.length === 0
                    ? 'Nenhum serviço vinculado'
                    : barber.services.map((service) => service.name).join(', ')}
                </p>
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
                <Link
                  href={`/b/${slug}/painel/barbeiros/${barber.id}`}
                  className={buttonSecondary}
                >
                  Gerenciar
                </Link>
              </div>
            </div>
          ))
        )}
      </section>
    </section>
  );
}