const STATUSES: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  scheduled: {
    label: 'Agendado',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dotClass: 'bg-emerald-600',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
    dotClass: 'bg-red-600',
  },
  completed: {
    label: 'Concluído',
    badgeClass: 'border-zinc-300 bg-zinc-100 text-zinc-700',
    dotClass: 'bg-zinc-500',
  },
  no_show: {
    label: 'Faltou',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    dotClass: 'bg-amber-600',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUSES[status] ?? {
    label: status,
    badgeClass: 'border-zinc-300 bg-zinc-100 text-zinc-700',
    dotClass: 'bg-zinc-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${config.badgeClass}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}