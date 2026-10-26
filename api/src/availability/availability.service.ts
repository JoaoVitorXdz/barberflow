import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { DatabaseService } from '../database/database.service';
import { computeAvailableSlots } from './availability.calculator';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

const SLOT_STEP_MINUTES = 30;

interface BusyRow {
  start: Date;
  end: Date;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly db: DatabaseService) {}

  async getSlots(tenantId: string, query: AvailabilityQueryDto) {
    const tenant = await this.db.query<{ timezone: string }>(
      `SELECT timezone FROM tenants WHERE id = $1`,
      [tenantId],
    );
    if (tenant.rows.length === 0) {
      throw new NotFoundException('Barbearia não encontrada');
    }
    const timezone = tenant.rows[0].timezone;

    const day = DateTime.fromISO(query.date, { zone: timezone });
    if (!day.isValid) {
      throw new BadRequestException('Data inválida');
    }

    const service = await this.db.query<{ duration: number }>(
      `SELECT duration_minutes AS duration
         FROM services
        WHERE id = $1 AND tenant_id = $2 AND active`,
      [query.serviceId, tenantId],
    );
    if (service.rows.length === 0) {
      throw new NotFoundException('Serviço não encontrado');
    }
    const duration = service.rows[0].duration;

    const barber = await this.db.query(
      `SELECT 1
         FROM barbers b
         JOIN barber_services bs ON bs.barber_id = b.id
        WHERE b.id = $1 AND b.tenant_id = $2 AND b.active
          AND bs.service_id = $3`,
      [query.barberId, tenantId, query.serviceId],
    );
    if (barber.rows.length === 0) {
      throw new NotFoundException(
        'Barbeiro não encontrado ou não realiza este serviço',
      );
    }

    const workingHours = await this.db.query<{
      weekday: number;
      startTime: string;
      endTime: string;
    }>(
      `SELECT weekday,
              to_char(start_time, 'HH24:MI') AS "startTime",
              to_char(end_time, 'HH24:MI') AS "endTime"
         FROM working_hours
        WHERE tenant_id = $1 AND barber_id = $2`,
      [tenantId, query.barberId],
    );

    // O dia local, convertido para UTC, é a janela em que procuramos conflitos.
    const dayStart = day.startOf('day');
    const dayEnd = dayStart.plus({ days: 1 });

    const busy = await this.db.query<BusyRow>(
      `SELECT lower(period) AS start, upper(period) AS "end"
         FROM time_blocks
        WHERE tenant_id = $1 AND barber_id = $2
          AND period && tstzrange($3::timestamptz, $4::timestamptz)
       UNION ALL
       SELECT lower(period), upper(period)
         FROM appointments
        WHERE tenant_id = $1 AND barber_id = $2 AND status = 'scheduled'
          AND period && tstzrange($3::timestamptz, $4::timestamptz)`,
      [
        tenantId,
        query.barberId,
        dayStart.toJSDate().toISOString(),
        dayEnd.toJSDate().toISOString(),
      ],
    );

    const slots = computeAvailableSlots({
      date: query.date,
      timezone,
      serviceDurationMinutes: duration,
      stepMinutes: SLOT_STEP_MINUTES,
      workingHours: workingHours.rows,
      busy: busy.rows.map((row) => ({ start: row.start, end: row.end })),
      now: new Date(),
    });

    return {
      date: query.date,
      timezone,
      durationMinutes: duration,
      slots: slots.map((slot) => ({
        startsAt: slot.toISOString(),
        endsAt: new Date(slot.getTime() + duration * 60_000).toISOString(),
        localTime: DateTime.fromJSDate(slot, { zone: timezone }).toFormat(
          'HH:mm',
        ),
      })),
    };
  }
}