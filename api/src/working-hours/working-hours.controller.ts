import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import * as authTypes from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SetWorkingHoursDto } from './dto/set-working-hours.dto';
import { WorkingHoursService } from './working-hours.service';

@Controller('barbers/:barberId/working-hours')
@UseGuards(AuthGuard, RolesGuard)
export class WorkingHoursController {
  constructor(private readonly workingHours: WorkingHoursService) {}

  @Get()
  findAll(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('barberId', ParseUUIDPipe) barberId: string,
  ) {
    return this.workingHours.findByBarber(req.user.tenantId, barberId);
  }

  @Put()
  @Roles('owner')
  replace(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('barberId', ParseUUIDPipe) barberId: string,
    @Body() dto: SetWorkingHoursDto,
  ) {
    return this.workingHours.replace(req.user.tenantId, barberId, dto);
  }
}