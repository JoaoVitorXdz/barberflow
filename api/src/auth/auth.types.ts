import type { Request } from 'express';

export type UserRole = 'owner' | 'barber' | 'receptionist' | 'customer';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & { user: JwtPayload };