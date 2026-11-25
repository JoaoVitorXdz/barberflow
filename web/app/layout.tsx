import type { Metadata } from 'next';
import { Barlow, Bevan } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const bevan = Bevan({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bevan',
  display: 'swap',
});

const barlow = Barlow({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BarberFlow',
  description: 'Agende seu horário na barbearia, sem ligar nem mandar mensagem.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${bevan.variable} ${barlow.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <header className="bg-zinc-900 text-zinc-50">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
            <Link
              href="/"
              className="group flex items-center gap-2.5 font-display text-xl tracking-wide transition-opacity hover:opacity-90"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-brass transition-transform duration-300 group-hover:scale-125"
                aria-hidden="true"
              />
              BarberFlow
            </Link>

            <Link
              href="/b/barbearia-demo/painel"
              className="rounded-sm border border-brass/50 bg-zinc-800/80 px-3.5 py-1.5 text-sm font-semibold text-zinc-100 transition-all hover:border-brass hover:bg-zinc-800 active:scale-[0.98]"
            >
              Painel do barbeiro
            </Link>
          </div>
          <div className="pole-stripe" aria-hidden="true" />
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-zinc-200/80 bg-zinc-50/80 py-4 text-xs text-zinc-500">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              Agendamento em tempo real · Sem conflito de horários
            </span>
            <span>BarberFlow</span>
          </div>
        </footer>
      </body>
    </html>
  );
}