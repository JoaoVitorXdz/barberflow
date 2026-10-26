import { IsUUID, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @IsUUID()
  barberId!: string;

  @IsUUID()
  serviceId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date deve estar no formato YYYY-MM-DD',
  })
  date!: string;
}