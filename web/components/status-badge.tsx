const STATUSES: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Agendado', className: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelado', className: 'bg-red-50 text-red-700' },
  completed: { label: 'Concluído', className: 'bg-zinc-100 text-zinc-700' },
  no_show: { label: 'Faltou', className: 'bg-amber-50 text-amber-700' },
};

export function StatusBadge({ status }: { status: string }) {
  const { label, className } = STATUSES[status] ?? {
    label: status,
    className: 'bg-zinc-100 text-zinc-700',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}