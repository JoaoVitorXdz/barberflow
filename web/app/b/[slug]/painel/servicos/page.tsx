import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { apiFetch } from '@/lib/api';
import type { ServiceItem } from '@/lib/booking-types';
import { requireStaff } from '@/lib/staff';
import { loadTenant } from '@/lib/tenant';
import { PanelNav } from '../panel-nav';
import { NewServiceForm } from './new-service-form';
import { ServiceCard } from './service-card';

type PageProps = { params: Promise<{ slug: string }> };

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function ServicesPage({ params }: PageProps) {
  return (
    <Suspense fallback={<ServicesSkeleton />}>
      <Services params={params} />
    </Suspense>
  );
}

async function Services({ params }: PageProps) {
  const { slug } = await params;

  const session = await requireStaff(slug);
  if (session.role !== 'owner') {
    redirect(`/b/${slug}/painel`);
  }

  const [tenant, services] = await Promise.all([
    loadTenant(slug),
    apiFetch<ServiceItem[]>('/services'),
  ]);

  const activeCount = services.filter((s) => s.active).length;

  return (
    <section className="space-y-8">
      <PanelNav
        slug={slug}
        tenantName={tenant.name}
        role={session.role}
        active="servicos"
      />

      {/* Cabeçalho principal */}
      <div className="animate-fade-up brass-card flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="max-w-xl space-y-1">
          <p className="text-xs font-bold tracking-[0.18em] text-brass uppercase">
            {tenant.name} · Gestão
          </p>
          <h1 className="text-2xl text-zinc-900 sm:text-3xl">Serviços</h1>
          <p className="text-sm text-zinc-600">
            Mudar o preço ou a duração não altera agendamentos já feitos.
            Serviços inativos deixam de aparecer para os clientes.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-bold tracking-wider text-zinc-700 uppercase">
          <span
            className="h-2 w-2 rounded-full bg-emerald-600"
            aria-hidden="true"
          />
          <span>
            {activeCount} {activeCount === 1 ? 'ativo' : 'ativos'} de{' '}
            {services.length}
          </span>
        </div>
      </div>

      {/* Formulário de novo serviço */}
      <div className="animate-fade-up delay-100">
        <NewServiceForm slug={slug} />
      </div>

      {/* Lista de serviços cadastrados */}
      <section className="animate-fade-up delay-200 space-y-3.5">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
            Catálogo cadastrado ({services.length})
          </h2>
          <div className="h-px flex-1 bg-zinc-300" aria-hidden="true" />
        </div>

        {services.length === 0 ? (
          <div className="rounded-sm border border-dashed border-zinc-300 bg-white/80 p-8 text-center">
            <p className="font-display text-lg text-zinc-900">
              Nenhum serviço cadastrado
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
              Adicione o primeiro corte, barba ou combo no formulário acima para
              liberar os agendamentos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <ServiceCard key={service.id} slug={slug} service={service} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function ServicesSkeleton() {
  return (
    <section
      className="space-y-8"
      aria-busy="true"
      aria-label="Carregando os serviços"
    >
      <div className="h-12 w-full animate-pulse rounded-sm bg-zinc-200" />

      <div className="h-28 w-full animate-pulse rounded-sm border border-zinc-200 bg-white" />

      <div className="overflow-hidden rounded-sm border border-zinc-300 bg-white">
        <div className="pole-stripe pole-stripe-loading" aria-hidden="true" />
        <div className="space-y-3 p-5 animate-pulse">
          <div className="h-20 rounded-sm bg-zinc-100" />
          <div className="h-20 rounded-sm bg-zinc-100" />
          <div className="h-20 rounded-sm bg-zinc-100" />
        </div>
      </div>
    </section>
  );
}