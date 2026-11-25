import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/lib/session';
import { loadTenant } from '@/lib/tenant';
import { RegisterForm } from './register-form';

// Permite a rota dinâmica blocking com Cache Components ativo no Next.js
export const instant = false;

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Garante a execução dinâmica no servidor para acesso aos cookies/params
  await connection();

  const { slug } = await params;
  if (await getSession(slug)) {
    redirect(`/b/${slug}`);
  }

  const tenant = await loadTenant(slug);

  return (
    <section className="mx-auto max-w-md space-y-5 py-2">
      <div className="animate-fade-up">
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
      </div>

      <div className="animate-fade-up delay-100 brass-card overflow-hidden">
        {/* Cabeçalho de identificação */}
        <div className="bg-zinc-900 px-6 py-5 text-zinc-50">
          <p className="text-xs font-bold tracking-[0.18em] text-brass uppercase">
            {tenant.name}
          </p>
          <h1 className="mt-1 text-2xl text-zinc-50">Criar conta</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Cadastre-se para agendar e acompanhar seus horários.
          </p>
        </div>

        <RegisterForm slug={slug} />
      </div>
    </section>
  );
}