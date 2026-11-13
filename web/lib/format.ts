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