import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';

export interface TimeBlockItem {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
}

const COLUMNS = `id, lower(period) AS "startsAt", upper(period) AS "endsAt", reason`;

@Injectable()
export class TimeBlocksService {
  constructor(private readonly db: DatabaseService) {}

  async create(
    tenantId: string,
    barberId: string,
    dto: CreateTimeBlockDto,
  ): Promise<TimeBlockItem> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt deve ser depois de startsAt');
    }

    return this.db.transaction(async (client) => {
      const barber = await client.query(
        `SELECT 1 FROM barbers WHERE id = $1 AND tenant_id = $2`,
        [barberId, tenantId],
      );
      if (barber.rows.length === 0) {
        throw new NotFoundException('Barbeiro não encontrado');
      }

      const conflict = await client.query(
        `SELECT 1 FROM appointments
          WHERE tenant_id = $1 AND barber_id = $2 AND status = 'scheduled'
            AND period && tstzrange($3::timestamptz, $4::timestamptz)
          LIMIT 1`,
        [tenantId, barberId, startsAt.toISOString(), endsAt.toISOString()],
      );
      if (conflict.rows.length > 0) {
        throw new ConflictException(
          'Há agendamentos nesse período; cancele ou remarque antes de bloquear',
        );
      }

      const result = await client.query<TimeBlockItem>(
        `INSERT INTO time_blocks (tenant_id, barber_id, period, reason)
         VALUES ($1, $2, tstzrange($3::timestamptz, $4::timestamptz), $5)
         RETURNING ${COLUMNS}`,
        [
          tenantId,
          barberId,
          startsAt.toISOString(),
          endsAt.toISOString(),
          dto.reason ?? null,
        ],
      );
      return result.rows[0];
    });
  }

  async findAll(
    tenantId: string,
    barberId: string,
    from?: string,
    to?: string,
  ): Promise<TimeBlockItem[]> {
    if (from && to && new Date(to) <= new Date(from)) {
      throw new BadRequestException('to deve ser depois de from');
    }
    await this.assertBarberExists(tenantId, barberId);

    const result = await this.db.query<TimeBlockItem>(
      `SELECT ${COLUMNS}
         FROM time_blocks
        WHERE tenant_id = $1 AND barber_id = $2
          AND period && tstzrange(COALESCE($3::timestamptz, now()), $4::timestamptz)
        ORDER BY lower(period)`,
      [
        tenantId,
        barberId,
        from ? new Date(from).toISOString() : null,
        to ? new Date(to).toISOString() : null,
      ],
    );
    return result.rows;
  }

  async remove(
    tenantId: string,
    barberId: string,
    id: string,
  ): Promise<void> {
    const result = await this.db.query(
      `DELETE FROM time_blocks
        WHERE id = $1 AND barber_id = $2 AND tenant_id = $3
        RETURNING id`,
      [id, barberId, tenantId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Bloqueio não encontrado');
    }
  }

  private async assertBarberExists(
    tenantId: string,
    barberId: string,
  ): Promise<void> {
    const result = await this.db.query(
      `SELECT 1 FROM barbers WHERE id = $1 AND tenant_id = $2`,
      [barberId, tenantId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Barbeiro não encontrado');
    }
  }
}