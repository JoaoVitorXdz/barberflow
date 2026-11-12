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
    <form action={formAction} className="space-y-4">
      <Field label="Nome" name="name" autoComplete="name" minLength={2} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" />
      <Field
        label="Telefone (opcional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        required={false}
      />
      <Field
        label="Senha (mínimo de 8 caracteres)"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? 'Criando conta...' : 'Criar conta'}
      </button>
      <p className="text-sm text-zinc-600">
        Já tem conta?{' '}
        <Link href={`/b/${slug}/entrar`} className="underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}