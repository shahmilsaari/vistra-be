import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Path, User } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreatePathDto } from './dto/create-path.dto';
import { PathResponseDto } from './dto/path-response.dto';

@Injectable()
export class PathsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logsService: LogsService,
  ) {}

  async create(dto: CreatePathDto, ownerId: number): Promise<PathResponseDto> {
    if (dto.parentId) {
      const parent = await this.prisma.path.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.ownerId !== ownerId) {
        throw new NotFoundException('Parent path not found');
      }
    }

    const path = await this.prisma.path.create({
      data: {
        name: dto.name,
        owner: { connect: { id: ownerId } },
        parent: dto.parentId ? { connect: { id: dto.parentId } } : undefined,
      },
      include: {
        owner: true,
      },
    });

    await this.logsService.recordAction({
      action: 'path.create',
      detail: `Created path ${path.name}`,
      userId: ownerId,
    });

    return this.toResponse(path);
  }

  private toResponse(path: Path & { owner: User }): PathResponseDto {
    return {
      id: path.id,
      name: path.name,
      parentId: path.parentId ?? undefined,
      owner: {
        id: path.owner.id,
        name: path.owner.name,
        email: path.owner.email,
      },
      createdAt: path.createdAt.toISOString(),
      updatedAt: path.updatedAt.toISOString(),
    };
  }
}
