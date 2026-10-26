import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator';
import { HAS_OFFSET } from '../../time-blocks/dto/create-time-block.dto';

export class CreateAppointmentDto {
  @IsUUID()
  barberId!: string;

  @IsUUID()
  serviceId!: string;

  @IsISO8601({ strict: true })
  @Matches(HAS_OFFSET, {
    message:
      'informe o fuso, ex.: 2026-11-03T12:00:00Z ou 2026-11-03T09:00:00-03:00',
  })
  startsAt!: string;

  // Usado por dono/recepção ao agendar para um cliente. O cliente agenda para si.
  @IsOptional()
  @IsUUID()
  customerId?: string;
}