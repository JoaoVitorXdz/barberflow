import type { ServiceItem } from '@/lib/booking-types';
import { formatDuration, formatPrice } from '@/lib/format';

interface ServiceCheckboxesProps {
  services: ServiceItem[];
  selectedIds?: string[];
}

export function ServiceCheckboxes({
  services,
  selectedIds = [],
}: ServiceCheckboxesProps) {
  if (services.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        Cadastre serviços primeiro na aba{' '}
        <strong className="font-semibold text-zinc-900">Serviços</strong> para
        poder vinculá-los ao barbeiro.
      </div>
    );
  }

  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-bold text-zinc-900">
        Serviços que realiza
      </legend>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {services.map((service) => (
          <label
            key={service.id}
            className="group flex cursor-pointer items-center justify-between gap-3 rounded-sm border-2 border-zinc-200 bg-zinc-50/60 p-3 text-sm transition-all duration-150 hover:border-brass has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-zinc-50 has-[:checked]:shadow-xs"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="serviceIds"
                value={service.id}
                defaultChecked={selectedIds.includes(service.id)}
                className="h-4 w-4 cursor-pointer rounded-xs accent-brass"
              />
              <div>
                <span className="block font-bold">
                  {service.name}
                  {!service.active && (
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">
                      (inativo)
                    </span>
                  )}
                </span>
                <span className="text-xs text-zinc-500 group-has-[:checked]:text-zinc-300">
                  {formatDuration(service.durationMinutes)}
                </span>
              </div>
            </div>

            <span className="font-bold tabular-nums text-zinc-900 group-has-[:checked]:text-[#e5c16c]">
              {formatPrice(service.priceCents)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}