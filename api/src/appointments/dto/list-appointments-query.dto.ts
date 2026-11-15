import { IsOptional, Matches } from 'class-validator';
import { ListTimeBlocksQueryDto } from '../../time-blocks/dto/list-time-blocks-query.dto';

export class ListAppointmentsQueryDto extends ListTimeBlocksQueryDto {
  // Dia inteiro no fuso da barbearia. Não combina com from/to.
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date deve estar no formato YYYY-MM-DD',
  })
  date?: string;
}