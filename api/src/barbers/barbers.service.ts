import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { CreateBarberDto } from './dto/create-barber.dto';

export interface BarberItem {
  id: string;
  displayName: string;
  email: string;
  active: boolean;
  services: { id: string; name: string }[];
}

const UNIQUE_VIOLATION = '23505';

const SELECT_BARBERS = `
  SELECT b.id,
         b.display_name AS "displayName",
         u.email,
         b.active,
         COALESCE(
           json_agg(json_build_object('id', s.id, 'name', s.name) ORDER BY s.name)
             FILTER (WHERE s.id IS NOT NULL),
           '[]'
         ) AS services
    FROM barbers b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN barber_services bs ON bs.barber_id = b.id
    LEFT JOIN services s ON s.id = bs.service_id
   WHERE b.tenant_id = $1`;

const GROUP_AND_ORDER = ` GROUP BY b.id, u.email ORDER BY b.display_name`;

@Injectable()
export class BarbersService {
  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, dto: CreateBarberDto): Promise<BarberItem> {
    const serviceIds = dto.serviceIds ?? [];
    const passwordHash = await hash(dto.password, 12);

    try {
      const barberId = await this.db.transaction(async (client) => {
        if (serviceIds.length > 0) {
          const found = await client.query<{ id: string }>(
            `SELECT id FROM services
              WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
            [tenantId, serviceIds],
          );
          if (found.rows.length !== serviceIds.length) {
            throw new BadRequestException(
              'Um ou mais serviços não existem nesta barbearia',
            );
          }
        }

        const user = await client.query<{ id: string }>(
          `INSERT INTO users (tenant_id, name, email, phone, password_hash, role)
           VALUES ($1, $2, $3, $4, $5, 'barber')
           RETURNING id`,
          [tenantId, dto.name, dto.email, dto.phone ?? null, passwordHash],
        );

        const barber = await client.query<{ id: string }>(
          `INSERT INTO barbers (tenant_id, user_id, display_name)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [tenantId, user.rows[0].id, dto.name],
        );
        const id = barber.rows[0].id;

        if (serviceIds.length > 0) {
          await client.query(
            `INSERT INTO barber_services (barber_id, service_id)
             SELECT $1, unnest($2::uuid[])`,
            [id, serviceIds],
          );
        }
        return id;
      });

      return await this.findOne(tenantId, barberId);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'Já existe um usuário com esse e-mail nesta barbearia',
        );
      }
      throw error;
    }
  }

  async findAll(tenantId: string): Promise<BarberItem[]> {
    const result = await this.db.query<BarberItem>(
      SELECT_BARBERS + GROUP_AND_ORDER,
      [tenantId],
    );
    return result.rows;
  }

  async findOne(tenantId: string, id: string): Promise<BarberItem> {
    const result = await this.db.query<BarberItem>(
      SELECT_BARBERS + ` AND b.id = $2` + GROUP_AND_ORDER,
      [tenantId, id],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Barbeiro não encontrado');
    }
    return result.rows[0];
  }
}