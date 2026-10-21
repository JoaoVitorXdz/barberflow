import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

export interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

const COLUMNS = `id, name, duration_minutes AS "durationMinutes",
  price_cents AS "priceCents", active`;

@Injectable()
export class ServicesService {
  constructor(private readonly db: DatabaseService) {}

  async create(tenantId: string, dto: CreateServiceDto): Promise<ServiceItem> {
    const result = await this.db.query<ServiceItem>(
      `INSERT INTO services (tenant_id, name, duration_minutes, price_cents)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [tenantId, dto.name, dto.durationMinutes, dto.priceCents],
    );
    return result.rows[0];
  }

  async findAll(
    tenantId: string,
    includeInactive: boolean,
  ): Promise<ServiceItem[]> {
    const result = await this.db.query<ServiceItem>(
      `SELECT ${COLUMNS}
         FROM services
        WHERE tenant_id = $1 AND ($2 OR active)
        ORDER BY name`,
      [tenantId, includeInactive],
    );
    return result.rows;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceItem> {
    const result = await this.db.query<ServiceItem>(
      `UPDATE services
          SET name = COALESCE($3, name),
              duration_minutes = COALESCE($4, duration_minutes),
              price_cents = COALESCE($5, price_cents),
              active = COALESCE($6, active)
        WHERE id = $1 AND tenant_id = $2
        RETURNING ${COLUMNS}`,
      [
        id,
        tenantId,
        dto.name ?? null,
        dto.durationMinutes ?? null,
        dto.priceCents ?? null,
        dto.active ?? null,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Serviço não encontrado');
    }
    return result.rows[0];
  }
}