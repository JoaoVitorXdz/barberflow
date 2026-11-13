import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { getSession } from '@/lib/session';
import { LoginForm } from './login-form';

// Permite a rota dinâmica blocking com Cache Components ativo no Next.js
export const instant = false;

export default async function LoginPage({
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

  return (
    <section className="mx-auto max-w-sm space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      <LoginForm slug={slug} />
    </section>
  );
}