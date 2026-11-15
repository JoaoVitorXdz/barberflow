export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

// Recebe "AAAA-MM-DD" e devolve algo como "terça-feira, 3 de novembro".
// O meio-dia evita que o fuso do navegador mude o dia.
export function formatLongDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

// Mostra o instante no fuso da barbearia, não no do navegador.
export function formatDateTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "Hoje" no fuso da barbearia, no formato AAAA-MM-DD
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

// Soma (ou subtrai) dias de uma data AAAA-MM-DD
export function shiftDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isFuture(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}