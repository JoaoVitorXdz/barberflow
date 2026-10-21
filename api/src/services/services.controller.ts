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
import { AuthGuard } from '../auth/auth.guard';
import * as authTypes from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(AuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  findAll(@Req() req: authTypes.AuthenticatedRequest) {
    return this.services.findAll(req.user.tenantId, req.user.role === 'owner');
  }

  @Post()
  @Roles('owner')
  create(@Req() req: authTypes.AuthenticatedRequest, @Body() dto: CreateServiceDto) {
    return this.services.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  @Roles('owner')
  update(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.update(req.user.tenantId, id, dto);
  }
}