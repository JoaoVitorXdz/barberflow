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
    <form action={formAction} className="space-y-4">
      <Field label="E-mail" name="email" type="email" autoComplete="email" />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
      <p className="text-sm text-zinc-600">
        Ainda não tem conta?{' '}
        <Link href={`/b/${slug}/cadastro`} className="underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}