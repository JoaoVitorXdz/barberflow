import { ListTimeBlocksQueryDto } from '../../time-blocks/dto/list-time-blocks-query.dto';

// Mesmos filtros dos bloqueios: from e to opcionais, com fuso obrigatório.
export class ListAppointmentsQueryDto extends ListTimeBlocksQueryDto {}