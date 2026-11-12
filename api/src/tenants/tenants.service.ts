import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface PublicTenant {
  name: string;
  slug: string;
  timezone: string;
}

@Injectable()
export class TenantsService {
  constructor(private readonly db: DatabaseService) {}

  async findPublicBySlug(slug: string): Promise<PublicTenant> {
    const result = await this.db.query<PublicTenant>(
      `SELECT name, slug, timezone FROM tenants WHERE slug = $1`,
      [slug],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Barbearia não encontrada');
    }
    return result.rows[0];
  }
}