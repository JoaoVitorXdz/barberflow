import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  SetWorkingHoursDto,
  WorkingHoursEntryDto,
} from './dto/set-working-hours.dto';

export interface WorkingHoursItem {
  weekday: number;
  startTime: string;
  endTime: string;
}

@Injectable()
export class WorkingHoursService {
  constructor(private readonly db: DatabaseService) {}

  async findByBarber(
    tenantId: string,
    barberId: string,
  ): Promise<WorkingHoursItem[]> {
    await this.assertBarberExists(tenantId, barberId);
    const result = await this.db.query<WorkingHoursItem>(
      `SELECT weekday,
              to_char(start_time, 'HH24:MI') AS "startTime",
              to_char(end_time, 'HH24:MI') AS "endTime"
         FROM working_hours
        WHERE tenant_id = $1 AND barber_id = $2
        ORDER BY weekday, start_time`,
      [tenantId, barberId],
    );
    return result.rows;
  }

  async replace(
    tenantId: string,
    barberId: string,
    dto: SetWorkingHoursDto,
  ): Promise<WorkingHoursItem[]> {
    this.validateEntries(dto.entries);

    await this.db.transaction(async (client) => {
      const barber = await client.query(
        `SELECT 1 FROM barbers WHERE id = $1 AND tenant_id = $2`,
        [barberId, tenantId],
      );
      if (barber.rows.length === 0) {
        throw new NotFoundException('Barbeiro não encontrado');
      }

      await client.query(
        `DELETE FROM working_hours WHERE barber_id = $1 AND tenant_id = $2`,
        [barberId, tenantId],
      );

      if (dto.entries.length > 0) {
        await client.query(
          `INSERT INTO working_hours (tenant_id, barber_id, weekday, start_time, end_time)
           SELECT $1, $2, t.w, t.s::time, t.e::time
             FROM unnest($3::int[], $4::text[], $5::text[]) AS t(w, s, e)`,
          [
            tenantId,
            barberId,
            dto.entries.map((e) => e.weekday),
            dto.entries.map((e) => e.startTime),
            dto.entries.map((e) => e.endTime),
          ],
        );
      }
    });

    return this.findByBarber(tenantId, barberId);
  }

  private validateEntries(entries: WorkingHoursEntryDto[]): void {
    for (const entry of entries) {
      if (entry.endTime <= entry.startTime) {
        throw new BadRequestException('endTime deve ser depois de startTime');
      }
    }

    const sorted = [...entries].sort(
      (a, b) =>
        a.weekday - b.weekday || a.startTime.localeCompare(b.startTime),
    );
    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      if (
        previous.weekday === current.weekday &&
        current.startTime < previous.endTime
      ) {
        throw new BadRequestException('Há horários sobrepostos no mesmo dia');
      }
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