import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check() {
    const result = await this.db.query<{ now: Date }>('SELECT now() AS now');
    return {
      status: 'ok',
      database: 'up',
      time: result.rows[0].now,
    };
  }
}