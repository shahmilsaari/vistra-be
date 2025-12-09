import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { LogsModule } from '../logs/logs.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [PrismaModule, LogsModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
