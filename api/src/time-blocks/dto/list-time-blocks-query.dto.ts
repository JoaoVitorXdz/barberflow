import { IsISO8601, IsOptional, Matches } from 'class-validator';
import { HAS_OFFSET } from './create-time-block.dto';

export class ListTimeBlocksQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(HAS_OFFSET, { message: 'informe o fuso em from' })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(HAS_OFFSET, { message: 'informe o fuso em to' })
  to?: string;
}