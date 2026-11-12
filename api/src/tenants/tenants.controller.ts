import { Controller, Get, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get(':slug')
  findPublic(@Param('slug') slug: string) {
    return this.tenants.findPublicBySlug(slug);
  }
}