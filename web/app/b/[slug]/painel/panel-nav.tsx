import Link from 'next/link';
import { buttonSecondary } from '@/components/ui';
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
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">
            Painel · {ROLE_LABELS[role] ?? role}
          </p>
          <p className="text-lg font-semibold">{tenantName}</p>
        </div>
        <form action={logoutAction.bind(null, slug)}>
          <button type="submit" className={buttonSecondary}>
            Sair
          </button>
        </form>
      </div>

      <nav className="flex gap-2 border-b border-zinc-200">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              item.key === active
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}