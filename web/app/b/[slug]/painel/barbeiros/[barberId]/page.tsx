import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { card } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type {
  BarberItem,
  ServiceItem,
  TimeBlockItem,
  WorkingHoursItem,
} from '@/lib/booking-types';
import { capitalizeFirst, formatDateTime } from '@/lib/format';
import { requireStaff } from '@/lib/staff';
import { loadTenant } from '@/lib/tenant';
import { PanelNav } from '../../panel-nav';
import { BarberActiveButton } from './barber-active-button';
import { BarberServicesForm } from './barber-services-form';
import { DeleteBlockButton } from './delete-block-button';
import { TimeBlockForm } from './time-block-form';
import { WorkingHoursForm } from './working-hours-form';

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

  // Só depois de confirmar que o barbeiro existe nesta barbearia
  const [hours, blocks] = await Promise.all([
    apiFetch<WorkingHoursItem[]>(
      `/barbers/${encodeURIComponent(barber.id)}/working-hours`,
    ),
    apiFetch<TimeBlockItem[]>(
      `/barbers/${encodeURIComponent(barber.id)}/time-blocks`,
    ),
  ]);

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
                    className="text-sm text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
        >
           Barbeiros
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

      {/* As keys refazem os formulários quando os dados salvos mudam */}
      <BarberServicesForm
        key={selectedIds.join(',')}
        slug={slug}
        barberId={barber.id}
        services={services}
        selectedIds={selectedIds}
      />

      <WorkingHoursForm
        key={JSON.stringify(hours)}
        slug={slug}
        barberId={barber.id}
        hours={hours}
      />

      <section className={`${card} space-y-4`}>
        <h2 className="text-lg font-semibold">Folgas e bloqueios</h2>

        {blocks.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nenhuma folga ou bloqueio futuro.
          </p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {capitalizeFirst(formatDateTime(block.startsAt, tenant.timezone))}
                  </p>
                  <p className="text-zinc-600">
                    até {formatDateTime(block.endsAt, tenant.timezone)}
                  </p>
                  {block.reason && <p className="text-zinc-500">{block.reason}</p>}
                </div>
                <DeleteBlockButton
                  slug={slug}
                  barberId={barber.id}
                  blockId={block.id}
                />
              </li>
            ))}
          </ul>
        )}

        <TimeBlockForm slug={slug} barberId={barber.id} />
      </section>
    </section>
  );
}