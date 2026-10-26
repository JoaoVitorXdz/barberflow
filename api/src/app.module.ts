import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BarbersModule } from './barbers/barbers.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { ServicesModule } from './services/services.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { TimeBlocksModule } from './time-blocks/time-blocks.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
    imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ServicesModule,
    BarbersModule,
    WorkingHoursModule,
    TimeBlocksModule,
    AvailabilityModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}