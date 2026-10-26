import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import { AvailabilityService } from '../availability/availability.service';
import { JwtPayload } from '../auth/auth.types';
import { DatabaseService } from '../database/database.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

const EXCLUSION_VIOLATION = '23P01';

export interface AppointmentItem {
  id: string;
  barberId: string;
  serviceId: string;
  customerId: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  priceCents: number;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly availability: AvailabilityService,
  ) {}

  async create(
    user: JwtPayload,
    dto: CreateAppointmentDto,
  ): Promise<AppointmentItem> {
    const { tenantId } = user;
    const customerId = await this.resolveCustomerId(user, dto.customerId);

    const tenant = await this.db.query<{ timezone: string }>(
      `SELECT timezone FROM tenants WHERE id = $1`,
      [tenantId],
    );
    if (tenant.rows.length === 0) {
      throw new NotFoundException('Barbearia não encontrada');
    }
    const timezone = tenant.rows[0].timezone;

    const startsAt = new Date(dto.startsAt);
    const startsAtIso = startsAt.toISOString();
    const localDate = DateTime.fromJSDate(startsAt, {
      zone: timezone,
    }).toISODate();
    if (!localDate) {
      throw new BadRequestException('Data inválida');
    }

    // Camada 1: o horário precisa ser um dos que a API oferece.
    // Também valida serviço e barbeiro (404 se não existirem nesta barbearia).
    const offered = await this.availability.getSlots(tenantId, {
      barberId: dto.barberId,
      serviceId: dto.serviceId,
      date: localDate,
    });
    if (!offered.slots.some((slot) => slot.startsAt === startsAtIso)) {
      throw new ConflictException('Horário indisponível');
    }

    const service = await this.db.query<{ duration: number; price: number }>(
      `SELECT duration_minutes AS duration, price_cents AS price
         FROM services
        WHERE id = $1 AND tenant_id = $2 AND active`,
      [dto.serviceId, tenantId],
    );
    if (service.rows.length === 0) {
      throw new NotFoundException('Serviço não encontrado');
    }
    const { duration, price } = service.rows[0];
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);

    // Camada 2: a exclusion constraint do banco garante, mesmo sob concorrência.
    try {
      const result = await this.db.query<AppointmentItem>(
        `INSERT INTO appointments
           (tenant_id, barber_id, customer_id, service_id, period, price_cents)
         VALUES ($1, $2, $3, $4, tstzrange($5::timestamptz, $6::timestamptz), $7)
         RETURNING id,
                   barber_id AS "barberId",
                   service_id AS "serviceId",
                   customer_id AS "customerId",
                   lower(period) AS "startsAt",
                   upper(period) AS "endsAt",
                   status,
                   price_cents AS "priceCents"`,
        [
          tenantId,
          dto.barberId,
          customerId,
          dto.serviceId,
          startsAtIso,
          endsAt.toISOString(),
          price,
        ],
      );
      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === EXCLUSION_VIOLATION) {
        throw new ConflictException(
          'Esse horário acabou de ser ocupado por outro cliente',
        );
      }
      throw error;
    }
  }

  private async resolveCustomerId(
    user: JwtPayload,
    requested?: string,
  ): Promise<string> {
    if (user.role === 'customer') {
      if (requested && requested !== user.sub) {
        throw new ForbiddenException(
          'Clientes só podem agendar para si mesmos',
        );
      }
      return user.sub;
    }

    if (!requested) {
      throw new BadRequestException(
        'customerId é obrigatório ao agendar para um cliente',
      );
    }
    const customer = await this.db.query(
      `SELECT 1 FROM users
        WHERE id = $1 AND tenant_id = $2 AND role = 'customer'`,
      [requested, user.tenantId],
    );
    if (customer.rows.length === 0) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return requested;
  }
}