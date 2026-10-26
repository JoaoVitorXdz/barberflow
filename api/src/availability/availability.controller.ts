import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import * as authTypes from '../auth/auth.types';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

@Controller('availability')
@UseGuards(AuthGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  getSlots(
    @Req() req: authTypes.AuthenticatedRequest,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.availability.getSlots(req.user.tenantId, query);
  }
}