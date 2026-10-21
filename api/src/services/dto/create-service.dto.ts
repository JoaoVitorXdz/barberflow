import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  priceCents!: number;
}