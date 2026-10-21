import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WorkingHoursEntryDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @Matches(HH_MM, { message: 'startTime deve estar no formato HH:MM' })
  startTime!: string;

  @Matches(HH_MM, { message: 'endTime deve estar no formato HH:MM' })
  endTime!: string;
}

export class SetWorkingHoursDto {
  @IsArray()
  @ArrayMaxSize(28)
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursEntryDto)
  entries!: WorkingHoursEntryDto[];
}