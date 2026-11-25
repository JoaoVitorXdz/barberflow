'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Field } from '@/components/field';
import { buttonPrimary } from '@/components/ui';
import { registerAction } from '../actions';

type FormState = {
  error?: string;
  [key: string]: unknown;
};

const initialState: FormState = {};

export function RegisterForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction.bind(null, slug),
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
          label="Nome completo"
          name="name"
          autoComplete="name"
          minLength={2}
          placeholder="Ex.: João Silva"
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
        />
        <Field
          label="Telefone (opcional)"
          name="phone"
          type="tel"
          autoComplete="tel"
          required={false}
          placeholder="(81) 99999-9999"
        />
        <Field
          label="Senha (mínimo de 8 caracteres)"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
            {pending ? 'Criando conta...' : 'Criar conta'}
          </button>
        </div>

        <div className="border-t border-zinc-200 pt-4 text-center text-sm text-zinc-600">
          Já tem conta?{' '}
          <Link
            href={`/b/${slug}/entrar`}
            className="font-semibold text-pole-blue underline decoration-brass decoration-2 underline-offset-4 transition-colors hover:text-zinc-900"
          >
            Entrar agora
          </Link>
        </div>
      </form>
    </div>
  );
}