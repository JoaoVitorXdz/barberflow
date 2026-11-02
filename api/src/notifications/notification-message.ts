import { DateTime } from 'luxon';

export interface MessageContext {
  kind: string;
  customerName: string;
  barberName: string;
  serviceName: string;
  barbershopName: string;
  startsAt: Date;
  timezone: string;
}

export function buildMessage(context: MessageContext): {
  subject: string;
  body: string;
} {
  const when = DateTime.fromJSDate(context.startsAt, { zone: context.timezone })
    .setLocale('pt-BR')
    .toFormat("cccc, dd/LL 'às' HH:mm");
  const hello = `Olá, ${context.customerName}!`;

  if (context.kind === 'reminder') {
    return {
      subject: `Lembrete do seu horário - ${context.barbershopName}`,
      body: `${hello} Lembrete: ${context.serviceName} com ${context.barberName}, ${when}.`,
    };
  }

  return {
    subject: `Agendamento confirmado - ${context.barbershopName}`,
    body: `${hello} Seu agendamento de ${context.serviceName} com ${context.barberName} está confirmado para ${when}.`,
  };
}