import { buildMessage } from './notification-message';
import { planNotifications } from './notification-plan';

describe('planNotifications', () => {
  const now = new Date('2026-11-01T12:00:00Z');

  it('agenda a confirmação na hora e o lembrete 2 horas antes', () => {
    const plan = planNotifications(new Date('2026-11-03T12:00:00Z'), now);

    expect(plan).toEqual([
      { kind: 'confirmation', scheduledFor: now },
      { kind: 'reminder', scheduledFor: new Date('2026-11-03T10:00:00Z') },
    ]);
  });

  it('não agenda lembrete quando o horário é daqui a menos de 2 horas', () => {
    const plan = planNotifications(new Date('2026-11-01T13:30:00Z'), now);

    expect(plan.map((item) => item.kind)).toEqual(['confirmation']);
  });

  it('não agenda lembrete quando o horário cai exatamente no limite de 2 horas', () => {
    const plan = planNotifications(new Date('2026-11-01T14:00:00Z'), now);

    expect(plan.map((item) => item.kind)).toEqual(['confirmation']);
  });
});

describe('buildMessage', () => {
  const base = {
    customerName: 'João',
    barberName: 'Carlos',
    serviceName: 'Corte masculino',
    barbershopName: 'Barbearia do Zé',
    startsAt: new Date('2026-11-03T12:00:00Z'), // 09:00 em Recife
    timezone: 'America/Recife',
  };

  it('mostra o horário no fuso da barbearia, não em UTC', () => {
    const { subject, body } = buildMessage({ ...base, kind: 'confirmation' });

    expect(subject).toContain('confirmado');
    expect(body).toContain('09:00');
    expect(body).toContain('03/11');
  });

  it('usa um texto diferente para o lembrete', () => {
    const { subject, body } = buildMessage({ ...base, kind: 'reminder' });

    expect(subject).toContain('Lembrete');
    expect(body).toContain('09:00');
  });
});