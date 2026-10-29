import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import * as authTypes from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';

@Controller('appointments')
@UseGuards(AuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @Roles('customer', 'owner', 'receptionist')
  create(
    @Req() req: authTypes.AuthenticatedRequest,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointments.create(req.user, dto);
  }

  @Get()
  findAll(
    @Req() req: authTypes.AuthenticatedRequest,
    @Query() query: ListAppointmentsQueryDto,
  ) {
    return this.appointments.findAll(req.user, query.from, query.to);
  }

  @Patch(':id/cancel')
  @Roles('customer', 'owner', 'receptionist')
  cancel(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointments.cancel(req.user, id);
  }
}