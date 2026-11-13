export interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export interface BarberItem {
  id: string;
  displayName: string;
  email: string;
  active: boolean;
  services: { id: string; name: string }[];
}

export interface SlotItem {
  startsAt: string;
  endsAt: string;
  localTime: string;
}

export interface SlotsResponse {
  slots: SlotItem[];
  error?: string;
}

export interface BookingResult {
  ok: boolean;
  error?: string;
}

export interface AppointmentListItem {
  id: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceCents: number;
  serviceName: string;
  barberName: string;
}