import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { buttonPrimary, buttonSecondary, card } from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { getSession } from '@/src/lib/session';
import { logoutAction } from '@/app/b/[slug]/actions';

// Permite a rota síncrona/dinâmica bloqueante com Cache Components
export const instant = false;

interface Tenant {
  name: string;
  slug: string;
  timezone: string;
}

async function loadTenant(slug: string): Promise<Tenant> {
  try {
    return await apiFetch<Tenant>(`/tenants/${encodeURIComponent(slug)}`, {
      auth: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

export default async function BarbershopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
  const tenant = await loadTenant(slug);
  const session = await getSession(slug);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-wide text-zinc-500">
          Barbearia
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{tenant.name}</h1>
      </div>

      {!session && (
        <div className={`${card} space-y-4`}>
          <p className="text-zinc-600">
            Entre ou crie sua conta para agendar um horário.
          </p>
          <div className="flex gap-3">
            <Link href={`/b/${slug}/entrar`} className={buttonPrimary}>
              Entrar
            </Link>
            <Link href={`/b/${slug}/cadastro`} className={buttonSecondary}>
              Criar conta
            </Link>
          </div>
        </div>
      )}

      {session?.role === 'customer' && (
        <div className={`${card} space-y-4`}>
          <p className="text-zinc-600">Você está conectado. O que deseja fazer?</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/b/${slug}/agendar`} className={buttonPrimary}>
              Agendar horário
            </Link>
            <Link href={`/b/${slug}/meus-agendamentos`} className={buttonSecondary}>
              Meus agendamentos
            </Link>
            <form action={logoutAction.bind(null, slug)}>
              <button type="submit" className={buttonSecondary}>
                Sair
              </button>
            </form>
          </div>
        </div>
      )}

      {session && session.role !== 'customer' && (
        <div className={`${card} space-y-4`}>
          <p className="text-zinc-600">
            Este acesso é de equipe ({session.role}). A área de agendamento é para
            clientes; entre com uma conta de cliente.
          </p>
          <form action={logoutAction.bind(null, slug)}>
            <button type="submit" className={buttonSecondary}>
              Sair
            </button>
          </form>
        </div>
      )}
    </section>
  );
}