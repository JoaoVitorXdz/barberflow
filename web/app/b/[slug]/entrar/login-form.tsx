'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Field } from '@/components/field';
import { buttonPrimary } from '@/components/ui';
import { loginAction } from '../actions';

type FormState = {
  error?: string;
};

const initialState: FormState = {};

export function LoginForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction.bind(null, slug),
    initialState,
  );

  return (
    <div className="relative">
      {pending && (
        <div
          className="pole-stripe pole-stripe-loading"
          aria-hidden="true"
        />
      )}

      <form action={formAction} className="space-y-4 p-6">
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
        />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />

        {state.error && (
          <p
            role="alert"
            className="rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            {state.error}
          </p>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={pending}
            className={`${buttonPrimary} w-full cursor-pointer shadow-sm transition-transform active:scale-[0.98]`}
          >
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </div>

        <div className="border-t border-zinc-200 pt-4 text-center text-sm text-zinc-600">
          Ainda não tem conta?{' '}
          <Link
            href={`/b/${slug}/cadastro`}
            className="font-semibold text-pole-blue underline decoration-brass decoration-2 underline-offset-4 transition-colors hover:text-zinc-900"
          >
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}