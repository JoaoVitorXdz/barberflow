import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { buttonSecondary } from '@/components/ui';
import { apiFetch } from '@/lib/api';
import type { BarberItem, ServiceItem } from '@/lib/booking-types';
import { requireStaff } from '@/lib/staff';
import { loadTenant } from '@/lib/tenant';
import { PanelNav } from '../panel-nav';
import { NewBarberForm } from './new-barber-form';

type PageProps = { params: Promise<{ slug: string }> };

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// A casca da página: sai na hora, e o conteúdo dinâmico chega em seguida.
export default function BarbersPage({ params }: PageProps) {
  return (
    <Suspense fallback={<BarbersSkeleton />}>
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

  const activeCount = barbers.filter((b) => b.active).length;

  return (
    <section className="space-y-8">
      <PanelNav
        slug={slug}
        tenantName={tenant.name}
        role={session.role}
        active="barbeiros"
      />

      {/* Cabeçalho principal */}
      <div className="animate-fade-up brass-card flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
        <div className="max-w-xl space-y-1">
          <p className="text-xs font-bold tracking-[0.18em] text-brass uppercase">
            {tenant.name} · Equipe
          </p>
          <h1 className="text-2xl text-zinc-900 sm:text-3xl">Barbeiros</h1>
          <p className="text-sm text-zinc-600">
            Gerencie os profissionais da barbearia, horários de expediente e os
            serviços que cada um realiza.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-bold tracking-wider text-zinc-700 uppercase">
          <span
            className="h-2 w-2 rounded-full bg-emerald-600"
            aria-hidden="true"
          />
          <span>
            {activeCount} {activeCount === 1 ? 'ativo' : 'ativos'} de{' '}
            {barbers.length}
          </span>
        </div>
      </div>

      {/* Formulário de novo barbeiro */}
      <div className="animate-fade-up delay-100">
        <NewBarberForm
          slug={slug}
          services={services.filter((service) => service.active)}
        />
      </div>

      {/* Lista de barbeiros */}
      <section className="animate-fade-up delay-200 space-y-3.5">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
            Equipe cadastrada ({barbers.length})
          </h2>
          <div className="h-px flex-1 bg-zinc-300" aria-hidden="true" />
        </div>

        {barbers.length === 0 ? (
          <div className="rounded-sm border border-dashed border-zinc-300 bg-white/80 p-8 text-center">
            <p className="font-display text-lg text-zinc-900">
              Nenhum barbeiro cadastrado
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600">
              Adicione o primeiro profissional no formulário acima para começar a
              receber agendamentos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className={`flex flex-wrap items-center justify-between gap-4 rounded-sm border border-zinc-300 border-l-4 bg-white p-4 transition-all duration-200 sm:px-5 ${
                  barber.active
                    ? 'border-l-brass shadow-2xs hover:-translate-y-0.5 hover:shadow-sm'
                    : 'border-l-zinc-400 bg-zinc-100/70 opacity-70'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold tracking-wider ${
                      barber.active
                        ? 'bg-zinc-900 text-zinc-50 ring-2 ring-brass/50'
                        : 'bg-zinc-300 text-zinc-700'
                    }`}
                    aria-hidden="true"
                  >
                    {getInitials(barber.displayName)}
                  </span>

                  <div className="space-y-1.5">
                    <div>
                      <p className="text-base font-bold text-zinc-900">
                        {barber.displayName}
                      </p>
                      <p className="text-xs font-medium text-zinc-500">
                        {barber.email}
                      </p>
                    </div>

                    {barber.services.length === 0 ? (
                      <p className="text-xs font-medium text-amber-800">
                        Nenhum serviço vinculado
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {barber.services.map((service) => (
                          <span
                            key={service.id}
                            className="rounded-sm border border-zinc-200 bg-zinc-100/80 px-2 py-0.5 text-xs font-medium text-zinc-700"
                          >
                            {service.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${
                      barber.active
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-zinc-300 bg-zinc-200/70 text-zinc-600'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        barber.active ? 'bg-emerald-600' : 'bg-zinc-500'
                      }`}
                      aria-hidden="true"
                    />
                    {barber.active ? 'Ativo' : 'Inativo'}
                  </span>

                  <Link
                    href={`/b/${slug}/painel/barbeiros/${barber.id}`}
                    className={`${buttonSecondary} group gap-1.5 px-3.5 py-1.5 text-sm`}
                  >
                    <span>Gerenciar</span>
                    <span
                      aria-hidden="true"
                      className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      &rarr;
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function BarbersSkeleton() {
  return (
    <section
      className="space-y-8"
      aria-busy="true"
      aria-label="Carregando os barbeiros"
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