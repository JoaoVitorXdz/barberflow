import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import * as authTypes from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BarbersService } from './barbers.service';
import { CreateBarberDto } from './dto/create-barber.dto';
import { UpdateBarberDto } from './dto/update-barber.dto';

@ApiBearerAuth()
@Controller('barbers')
@UseGuards(AuthGuard, RolesGuard)
export class BarbersController {
  constructor(private readonly barbers: BarbersService) {}

  @Get()
  findAll(@Req() req: authTypes.AuthenticatedRequest) {
    return this.barbers.findAll(req.user.tenantId);
  }

  @Post()
  @Roles('owner')
  create(@Req() req: authTypes.AuthenticatedRequest, @Body() dto: CreateBarberDto) {
    return this.barbers.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('owner')
  update(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBarberDto,
  ) {
    return this.barbers.update(req.user.tenantId, id, dto);
  }
}