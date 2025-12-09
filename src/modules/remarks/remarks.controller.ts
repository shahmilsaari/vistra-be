import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../users/interfaces/jwt-payload.interface';
import { CreateRemarkDto } from './dto/create-remark.dto';
import { QueryRemarksDto } from './dto/query-remarks.dto';
import { RemarksService } from './remarks.service';

@UseGuards(JwtAuthGuard)
@Controller('remarks')
export class RemarksController {
  constructor(private readonly remarksService: RemarksService) {}

  @Post()
  create(@Body() dto: CreateRemarkDto, @CurrentUser() user: JwtPayload) {
    return this.remarksService.create(dto, Number(user.sub));
  }

  @Get('attachment/:attachmentId')
  list(@Param('attachmentId', ParseIntPipe) attachmentId: number, @Query() query: QueryRemarksDto) {
    return this.remarksService.listByAttachment(attachmentId, query);
  }
}
