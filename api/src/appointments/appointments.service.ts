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

// Erros do PostgreSQL que significam "outro cliente ficou com o horário".
const EXCLUSION_VIOLATION = '23P01';
const DEADLOCK_DETECTED = '40P01';

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

const COLUMNS = `id,
  barber_id AS "barberId",
  service_id AS "serviceId",
  customer_id AS "customerId",
  lower(period) AS "startsAt",
  upper(period) AS "endsAt",
  status,
  price_cents AS "priceCents"`;

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
         RETURNING ${COLUMNS}`,
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
      const code = (error as { code?: string }).code;
      if (code === EXCLUSION_VIOLATION || code === DEADLOCK_DETECTED) {
        throw new ConflictException(
          'Esse horário acabou de ser ocupado por outro cliente',
        );
      }
      throw error;
    }
  }

  async findAll(
    user: JwtPayload,
    from?: string,
    to?: string,
  ): Promise<AppointmentItem[]> {
    if (from && to && new Date(to) <= new Date(from)) {
      throw new BadRequestException('to deve ser depois de from');
    }

    // Cliente vê só os seus; barbeiro vê só os dele; dono e recepção veem todos.
    const customerFilter = user.role === 'customer' ? user.sub : null;
    const barberUserFilter = user.role === 'barber' ? user.sub : null;

    const result = await this.db.query<AppointmentItem>(
      `SELECT ${COLUMNS}
         FROM appointments
        WHERE tenant_id = $1
          AND ($2::uuid IS NULL OR customer_id = $2::uuid)
          AND ($3::uuid IS NULL OR barber_id IN (
                SELECT id FROM barbers
                 WHERE user_id = $3::uuid AND tenant_id = $1))
          AND period && tstzrange(COALESCE($4::timestamptz, now()), $5::timestamptz)
        ORDER BY lower(period)`,
      [
        user.tenantId,
        customerFilter,
        barberUserFilter,
        from ? new Date(from).toISOString() : null,
        to ? new Date(to).toISOString() : null,
      ],
    );
    return result.rows;
  }

  async cancel(user: JwtPayload, id: string): Promise<AppointmentItem> {
    const customerFilter = user.role === 'customer' ? user.sub : null;

    const result = await this.db.query<AppointmentItem>(
      `UPDATE appointments
          SET status = 'cancelled'
        WHERE id = $1 AND tenant_id = $2
          AND ($3::uuid IS NULL OR customer_id = $3::uuid)
          AND status = 'scheduled'
          AND lower(period) > now()
        RETURNING ${COLUMNS}`,
      [id, user.tenantId, customerFilter],
    );
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Nada foi alterado: ou não existe (para este usuário), ou não pode mais ser cancelado.
    const exists = await this.db.query(
      `SELECT 1 FROM appointments
        WHERE id = $1 AND tenant_id = $2
          AND ($3::uuid IS NULL OR customer_id = $3::uuid)`,
      [id, user.tenantId, customerFilter],
    );
    if (exists.rows.length === 0) {
      throw new NotFoundException('Agendamento não encontrado');
    }
    throw new ConflictException(
      'Só é possível cancelar agendamentos futuros que ainda estão ativos',
    );
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