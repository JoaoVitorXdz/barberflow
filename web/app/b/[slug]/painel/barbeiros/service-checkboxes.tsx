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
      <p className="text-sm text-zinc-600">
        Cadastre serviços primeiro, na aba Serviços.
      </p>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Serviços que realiza</legend>
      {services.map((service) => (
        <label key={service.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="serviceIds"
            value={service.id}
            defaultChecked={selectedIds.includes(service.id)}
            className="h-4 w-4"
          />
          <span>
            {service.name}
            {service.active ? '' : ' (inativo)'}{' '}
            <span className="text-zinc-500">
              · {formatDuration(service.durationMinutes)} ·{' '}
              {formatPrice(service.priceCents)}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}