import { IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export const HAS_OFFSET = /(Z|[+-]\d{2}:\d{2})$/;
const OFFSET_MESSAGE =
  'informe o fuso, ex.: 2026-11-02T00:00:00Z ou 2026-11-02T00:00:00-03:00';

export class CreateTimeBlockDto {
  @IsISO8601({ strict: true })
  @Matches(HAS_OFFSET, { message: OFFSET_MESSAGE })
  startsAt!: string;

  @IsISO8601({ strict: true })
  @Matches(HAS_OFFSET, { message: OFFSET_MESSAGE })
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}