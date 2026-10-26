import { Module } from '@nestjs/common';
import { TimeBlocksController } from './time-blocks.controller';
import { TimeBlocksService } from './time-blocks.service';

@Module({
  controllers: [TimeBlocksController],
  providers: [TimeBlocksService],
})
export class TimeBlocksModule {}