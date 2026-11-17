// Diferença, em milissegundos, entre a hora local do fuso e o UTC naquele instante.
function offsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);

  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const localAsUtc = Date.UTC(
    value('year'),
    value('month') - 1,
    value('day'),
    value('hour'),
    value('minute'),
    value('second'),
  );
  return localAsUtc - instant.getTime();
}

// "2026-11-16T09:00" (hora na barbearia) -> "2026-11-16T12:00:00.000Z"
export function localDateTimeToUtcIso(
  local: string,
  timeZone: string,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(local);
  if (!match) return null;

  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);

  // A segunda passada cobre horários perto de uma mudança de horário de verão.
  let utc = wallClock - offsetMs(new Date(wallClock), timeZone);
  utc = wallClock - offsetMs(new Date(utc), timeZone);
  return new Date(utc).toISOString();
}