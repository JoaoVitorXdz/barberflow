import {
  AvailabilityInput,
  computeAvailableSlots,
} from './availability.calculator';

const TZ = 'America/Recife'; // UTC-3, sem horário de verão

const jornadaPadrao = [
  { weekday: 1, startTime: '09:00', endTime: '12:00' },
  { weekday: 1, startTime: '14:00', endTime: '19:00' },
];

function build(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    date: '2026-11-02', // segunda-feira
    timezone: TZ,
    serviceDurationMinutes: 30,
    stepMinutes: 30,
    workingHours: jornadaPadrao,
    busy: [],
    now: new Date('2026-10-26T12:00:00Z'),
    ...overrides,
  };
}

const iso = (dates: Date[]) => dates.map((d) => d.toISOString());

describe('computeAvailableSlots', () => {
  it('gera horários nas duas janelas e respeita a pausa de almoço', () => {
    const slots = iso(computeAvailableSlots(build()));

    expect(slots).toHaveLength(16);
    expect(slots[0]).toBe('2026-11-02T12:00:00.000Z'); // 09:00 em Recife
    expect(slots).not.toContain('2026-11-02T15:00:00.000Z'); // 12:00, almoço
    expect(slots).not.toContain('2026-11-02T16:30:00.000Z'); // 13:30, almoço
    expect(slots[slots.length - 1]).toBe('2026-11-02T21:30:00.000Z'); // 18:30
  });

  it('não oferece horário cujo serviço ultrapassaria o fim da jornada', () => {
    const slots = iso(
      computeAvailableSlots(
        build({
          serviceDurationMinutes: 45,
          workingHours: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }],
        }),
      ),
    );

    expect(slots).toHaveLength(5);
    expect(slots[slots.length - 1]).toBe('2026-11-02T14:00:00.000Z'); // 11:00
  });

  it('remove horários sobrepostos a um bloqueio, sem remover os vizinhos', () => {
    const slots = iso(
      computeAvailableSlots(
        build({
          workingHours: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }],
          busy: [
            {
              start: new Date('2026-11-02T13:00:00Z'), // 10:00 local
              end: new Date('2026-11-02T14:00:00Z'), // 11:00 local
            },
          ],
        }),
      ),
    );

    expect(slots).toEqual([
      '2026-11-02T12:00:00.000Z', // 09:00
      '2026-11-02T12:30:00.000Z', // 09:30 termina às 10:00: encosta, não sobrepõe
      '2026-11-02T14:00:00.000Z', // 11:00 começa quando o bloqueio termina
      '2026-11-02T14:30:00.000Z', // 11:30
    ]);
  });

  it('um agendamento desalinhado bloqueia todos os horários que ele toca', () => {
    const slots = iso(
      computeAvailableSlots(
        build({
          workingHours: [{ weekday: 1, startTime: '09:00', endTime: '12:00' }],
          busy: [
            {
              start: new Date('2026-11-02T13:15:00Z'), // 10:15 local
              end: new Date('2026-11-02T13:45:00Z'), // 10:45 local
            },
          ],
        }),
      ),
    );

    expect(slots).toHaveLength(4);
    expect(slots).not.toContain('2026-11-02T13:00:00.000Z'); // 10:00
    expect(slots).not.toContain('2026-11-02T13:30:00.000Z'); // 10:30
  });

  it('retorna vazio em dia sem jornada', () => {
    const slots = computeAvailableSlots(build({ date: '2026-11-01' })); // domingo
    expect(slots).toEqual([]);
  });

  it('não oferece horários que já passaram', () => {
    const slots = iso(
      computeAvailableSlots(
        build({ now: new Date('2026-11-02T17:10:00Z') }), // 14:10 local
      ),
    );

    expect(slots[0]).toBe('2026-11-02T17:30:00.000Z'); // 14:30 local
    expect(slots).toHaveLength(9);
  });

  it('converte corretamente o fuso quando o horário local cruza a meia-noite UTC', () => {
    const slots = iso(
      computeAvailableSlots(
        build({
          workingHours: [{ weekday: 1, startTime: '22:00', endTime: '23:30' }],
        }),
      ),
    );

    expect(slots).toEqual([
      '2026-11-03T01:00:00.000Z', // 22:00 local já é o dia seguinte em UTC
      '2026-11-03T01:30:00.000Z',
      '2026-11-03T02:00:00.000Z',
    ]);
  });

  it('rejeita entradas inválidas', () => {
    expect(() => computeAvailableSlots(build({ stepMinutes: 0 }))).toThrow();
    expect(() =>
      computeAvailableSlots(build({ date: '2026-02-31' })),
    ).toThrow();
    expect(() =>
      computeAvailableSlots(build({ timezone: 'Mars/Olympus' })),
    ).toThrow();
  });
});