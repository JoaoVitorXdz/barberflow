import Link from 'next/link';
import { logoutAction } from '../actions';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Dono',
  receptionist: 'Recepção',
  barber: 'Barbeiro',
};

interface PanelNavProps {
  slug: string;
  tenantName: string;
  role: string;
  active: string;
}

export function PanelNav({ slug, tenantName, role, active }: PanelNavProps) {
  const items = [
    { key: 'agenda', label: 'Agenda', href: `/b/${slug}/painel` },
    ...(role === 'owner'
      ? [
          {
            key: 'servicos',
            label: 'Serviços',
            href: `/b/${slug}/painel/servicos`,
          },
          {
            key: 'barbeiros',
            label: 'Barbeiros',
            href: `/b/${slug}/painel/barbeiros`,
          },
        ]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-sm border border-zinc-300 bg-white shadow-2xs">
      {/* Barra superior em esmalte escuro */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 px-5 py-4 text-zinc-50 sm:px-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="font-display text-xl tracking-wide text-zinc-50">
              {tenantName}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-sm border border-brass/50 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-brass uppercase">
              <span
                className="h-1.5 w-1.5 rounded-full bg-brass"
                aria-hidden="true"
              />
              {ROLE_LABELS[role] ?? role}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Painel administrativo e gestão de horários
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/b/${slug}`}
            className="rounded-sm border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
          >
            Ver vitrine &rarr;
          </Link>

          <form action={logoutAction.bind(null, slug)}>
            <button
              type="submit"
              className="cursor-pointer rounded-sm border border-red-400/30 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:border-red-400/60 hover:bg-red-950/60 hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </div>

      {/* Navegação por abas */}
      <nav
        aria-label="Seções do painel"
        className="flex flex-wrap gap-1 border-t border-zinc-200 bg-zinc-50/90 px-3 pt-2 sm:px-5"
      >
        {items.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative rounded-t-sm border-b-2 px-4 py-2.5 text-sm font-bold tracking-wide transition-all ${
                isActive
                  ? 'border-b-brass bg-white text-zinc-900 shadow-2xs'
                  : 'border-b-transparent text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}