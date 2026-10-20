import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { JwtPayload, UserRole } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async registerTenant(dto: RegisterTenantDto) {
    const passwordHash = await hash(dto.password, 12);

    try {
      return await this.db.transaction(async (client) => {
        const tenant = await client.query<{ id: string }>(
          `INSERT INTO tenants (name, slug, timezone)
           VALUES ($1, $2, COALESCE($3, 'America/Recife'))
           RETURNING id`,
          [dto.barbershopName, dto.slug, dto.timezone ?? null],
        );
        const tenantId = tenant.rows[0].id;

        const user = await client.query<{ id: string }>(
          `INSERT INTO users (tenant_id, name, email, password_hash, role)
           VALUES ($1, $2, $3, $4, 'owner')
           RETURNING id`,
          [tenantId, dto.ownerName, dto.email, passwordHash],
        );

        return this.issueToken({
          sub: user.rows[0].id,
          tenantId,
          role: 'owner',
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException('Já existe uma barbearia com esse slug');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const result = await this.db.query<{
      id: string;
      tenant_id: string;
      password_hash: string;
      role: UserRole;
    }>(
      `SELECT u.id, u.tenant_id, u.password_hash, u.role
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
        WHERE t.slug = $1 AND u.email = $2`,
      [dto.tenantSlug, dto.email],
    );

    const user = result.rows[0];
    const passwordOk = user
      ? await compare(dto.password, user.password_hash)
      : false;

    if (!user || !passwordOk) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.issueToken({
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    });
  }

  private async issueToken(payload: JwtPayload) {
    return { accessToken: await this.jwt.signAsync(payload) };
  }
}