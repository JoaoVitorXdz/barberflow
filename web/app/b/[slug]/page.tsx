import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { buttonPrimary, buttonSecondary } from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { getSession } from '@/lib/session';
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
    <section className="mx-auto max-w-2xl space-y-8 py-2">
      {/* Navegação de retorno */}
      <div className="animate-fade-up flex items-center justify-between gap-4">
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:text-zinc-900"
        >
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-200 group-hover:-translate-x-1"
          >
            &larr;
          </span>
          <span>Trocar barbearia</span>
        </Link>

        <span className="inline-flex items-center gap-1.5 rounded-sm border border-brass/40 bg-white px-2.5 py-1 text-xs font-bold tracking-wider text-zinc-800 uppercase shadow-2xs">
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-600"
            aria-hidden="true"
          />
          Agendamento online
        </span>
      </div>

      {/* Placa de esmalte da barbearia (Fachada) */}
      <header className="animate-fade-up delay-100 sign shadow-md">
        <p className="text-xs font-bold tracking-[0.22em] text-brass uppercase">
          Barbearia
        </p>
        <h1 className="mt-2 text-3xl text-zinc-50 sm:text-4xl">
          {tenant.name}
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-sm text-zinc-300">
          Escolha seu serviço, selecione o profissional e garanta seu horário em
          poucos cliques.
        </p>
      </header>

      {/* Estado 1: Visitante não logado */}
      {!session && (
        <div className="animate-fade-up delay-200 brass-card space-y-5 p-6 sm:p-7">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-wider text-brass uppercase">
              Acesso do cliente
            </span>
            <h2 className="text-xl font-bold text-zinc-900">
              Pronto para marcar seu horário?
            </h2>
            <p className="text-sm text-zinc-600">
              Entre com sua conta ou crie um cadastro rápido para visualizar a
              agenda completa.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href={`/b/${slug}/entrar`}
              className={`${buttonPrimary} shadow-sm transition-transform active:scale-[0.98]`}
            >
              Entrar na conta
            </Link>
            <Link
              href={`/b/${slug}/cadastro`}
              className={`${buttonSecondary} transition-transform active:scale-[0.98]`}
            >
              Criar conta
            </Link>
          </div>
        </div>
      )}

      {/* Estado 2: Cliente autenticado */}
      {session?.role === 'customer' && (
        <div className="animate-fade-up delay-200 brass-card space-y-5 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-700 uppercase">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-600"
                  aria-hidden="true"
                />
                Sessão ativa
              </span>
              <h2 className="text-xl font-bold text-zinc-900">
                Bem-vindo de volta!
              </h2>
              <p className="text-sm text-zinc-600">
                O que você gostaria de fazer agora?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-5">
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/b/${slug}/agendar`}
                className={`${buttonPrimary} shadow-sm transition-transform active:scale-[0.98]`}
              >
                Agendar horário
              </Link>
              <Link
                href={`/b/${slug}/meus-agendamentos`}
                className={`${buttonSecondary} transition-transform active:scale-[0.98]`}
              >
                Meus agendamentos
              </Link>
            </div>

            <form action={logoutAction.bind(null, slug)}>
              <button
                type="submit"
                className="cursor-pointer px-2 py-1.5 text-sm font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-red-700 hover:decoration-red-400"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Estado 3: Equipe / Barbeiro / Dono */}
      {session && session.role !== 'customer' && (
        <div className="animate-fade-up delay-200 brass-card space-y-5 p-6 sm:p-7">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-brass uppercase">
              Acesso administrativo
            </span>
            <h2 className="text-xl font-bold text-zinc-900">
              Área da equipe
            </h2>
            <p className="text-sm text-zinc-600">
              Você está conectado como equipe de {tenant.name}. Acesse o painel
              para gerenciar a agenda e os serviços.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-5">
            <Link
              href={`/b/${slug}/painel`}
              className={`${buttonPrimary} shadow-sm transition-transform active:scale-[0.98]`}
            >
              Abrir painel de gestão &rarr;
            </Link>

            <form action={logoutAction.bind(null, slug)}>
              <button
                type="submit"
                className="cursor-pointer px-2 py-1.5 text-sm font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-red-700 hover:decoration-red-400"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Diferenciais rápidos da barbearia */}
      <div className="animate-fade-up delay-300 grid gap-3 sm:grid-cols-3">
        <div className="rounded-sm border border-zinc-300/80 bg-white/80 p-4">
          <p className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
            Sem espera
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Veja apenas os horários realmente livres na agenda em tempo real.
          </p>
        </div>

        <div className="rounded-sm border border-zinc-300/80 bg-white/80 p-4">
          <p className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
            Escolha livre
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Selecione o serviço, confira o valor e escolha seu barbeiro.
          </p>
        </div>

        <div className="rounded-sm border border-zinc-300/80 bg-white/80 p-4">
          <p className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
            Reserva direta
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            Confirmação instantânea sem precisar ligar ou mandar mensagem.
          </p>
        </div>
      </div>
    </section>
  );
}