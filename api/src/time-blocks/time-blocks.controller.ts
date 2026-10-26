import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import * as authTypes from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTimeBlockDto } from './dto/create-time-block.dto';
import { ListTimeBlocksQueryDto } from './dto/list-time-blocks-query.dto';
import { TimeBlocksService } from './time-blocks.service';

@Controller('barbers/:barberId/time-blocks')
@UseGuards(AuthGuard, RolesGuard)
export class TimeBlocksController {
  constructor(private readonly timeBlocks: TimeBlocksService) {}

  @Get()
  findAll(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('barberId', ParseUUIDPipe) barberId: string,
    @Query() query: ListTimeBlocksQueryDto,
  ) {
    return this.timeBlocks.findAll(
      req.user.tenantId,
      barberId,
      query.from,
      query.to,
    );
  }

  @Post()
  @Roles('owner')
  create(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('barberId', ParseUUIDPipe) barberId: string,
    @Body() dto: CreateTimeBlockDto,
  ) {
    return this.timeBlocks.create(req.user.tenantId, barberId, dto);
  }

  @Delete(':id')
  @Roles('owner')
  @HttpCode(204)
  async remove(
    @Req() req: authTypes.AuthenticatedRequest,
    @Param('barberId', ParseUUIDPipe) barberId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.timeBlocks.remove(req.user.tenantId, barberId, id);
  }
}