import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../users/interfaces/jwt-payload.interface';
import { CreatePathDto } from './dto/create-path.dto';
import { PathsService } from './paths.service';

@UseGuards(JwtAuthGuard)
@Controller('paths')
export class PathsController {
  constructor(private readonly pathsService: PathsService) {}

  @Post()
  create(@Body() dto: CreatePathDto, @CurrentUser() user: JwtPayload) {
    return this.pathsService.create(dto, Number(user.sub));
  }
}
