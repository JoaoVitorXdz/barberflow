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
    <Suspense
      fallback={<p className="text-sm text-zinc-500">Carregando os serviços...</p>}
    >
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

  return (
    <section className="space-y-6">
      <PanelNav
        slug={slug}
        tenantName={tenant.name}
        role={session.role}
        active="servicos"
      />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
        <p className="text-sm text-zinc-600">
          Mudar o preço ou a duração não altera agendamentos já feitos. Serviços
          inativos deixam de aparecer para os clientes.
        </p>
      </div>

      <NewServiceForm slug={slug} />

      <section className="space-y-3">
        {services.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nenhum serviço cadastrado ainda.
          </p>
        ) : (
          services.map((service) => (
            <ServiceCard key={service.id} slug={slug} service={service} />
          ))
        )}
      </section>
    </section>
  );
}