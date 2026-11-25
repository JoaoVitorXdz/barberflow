import Link from 'next/link';
import { buttonPrimary, inputClass } from '@/components/ui';
import { goToShopAction } from './actions';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="grid items-center gap-10 md:grid-cols-[1fr_auto] md:gap-16">
        <div className="space-y-5">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-sm border border-brass/40 bg-white px-3 py-1 text-xs font-bold tracking-wider text-zinc-800 uppercase shadow-2xs">
            <span
              className="h-1.5 w-1.5 rounded-full bg-pole-red"
              aria-hidden="true"
            />
            Veja só os horários livres
          </div>

          <h1 className="animate-fade-up delay-100 text-4xl sm:text-5xl">
            Seu horário na barbearia, sem ligar nem mandar mensagem
          </h1>

          <p className="animate-fade-up delay-200 max-w-prose text-lg text-zinc-700">
            Informe o código da sua barbearia, escolha o barbeiro e veja só os
            horários livres.
          </p>

          <div className="animate-fade-up delay-300 brass-card max-w-md p-5 sm:p-6">
            <form action={goToShopAction} className="space-y-2.5">
              <label
                htmlFor="slug"
                className="block text-sm font-bold tracking-wide text-zinc-900"
              >
                Código da barbearia
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="slug"
                  name="slug"
                  required
                  placeholder="ex.: barbearia-demo"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className={inputClass}
                />
                <button
                  type="submit"
                  className={`${buttonPrimary} cursor-pointer whitespace-nowrap transition-transform active:scale-[0.97]`}
                >
                  Ver horários
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3.5 text-sm text-zinc-600">
              <span>Está no link da barbearia.</span>
              <Link
                href="/b/barbearia-demo"
                className="group inline-flex items-center gap-1 font-semibold text-pole-blue underline decoration-brass decoration-2 underline-offset-4 transition-colors hover:text-zinc-900"
              >
                <span>Testar barbearia-demo</span>
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Poste de barbeiro girando continuamente com sombra de apoio */}
        <div className="animate-fade-up delay-200 mx-auto hidden flex-col items-center px-4 md:flex">
          <div className="pole" aria-hidden="true" />
          <div
            className="mt-7 h-3 w-24 rounded-full bg-zinc-900/15 blur-xs"
            aria-hidden="true"
          />
        </div>
      </section>

      {/* Como funciona */}
      <section
        aria-labelledby="como-funciona"
        className="animate-fade-up delay-400 space-y-4"
      >
        <div className="flex items-center gap-3">
          <h2
            id="como-funciona"
            className="text-xs font-bold tracking-widest text-zinc-500 uppercase"
          >
            Como funciona
          </h2>
          <div className="h-px flex-1 bg-zinc-300" aria-hidden="true" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="step-card group space-y-1.5 p-5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-zinc-900 text-xs font-bold text-zinc-50 transition-colors duration-200 group-hover:bg-brass">
              1
            </span>
            <h3 className="font-bold text-zinc-900">Informe o código</h3>
            <p className="text-sm text-zinc-600">
              Digite o identificador da barbearia ou acesse direto pelo link
              divulgado.
            </p>
          </div>

          <div className="step-card group space-y-1.5 p-5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-zinc-900 text-xs font-bold text-zinc-50 transition-colors duration-200 group-hover:bg-brass">
              2
            </span>
            <h3 className="font-bold text-zinc-900">Escolha o serviço</h3>
            <p className="text-sm text-zinc-600">
              Veja os valores, a duração e apenas os horários livres na agenda.
            </p>
          </div>

          <div className="step-card group space-y-1.5 p-5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-zinc-900 text-xs font-bold text-zinc-50 transition-colors duration-200 group-hover:bg-brass">
              3
            </span>
            <h3 className="font-bold text-zinc-900">Confirme na hora</h3>
            <p className="text-sm text-zinc-600">
              Preencha seu nome e telefone sem precisar criar conta nem baixar
              aplicativo.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}