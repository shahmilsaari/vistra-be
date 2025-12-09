import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { RemarksController } from './remarks.controller';
import { RemarksService } from './remarks.service';

@Module({
  imports: [PrismaModule],
  controllers: [RemarksController],
  providers: [RemarksService],
})
export class RemarksModule {}
