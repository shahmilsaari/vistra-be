import { Injectable, NotFoundException } from '@nestjs/common';
import type { Remark, User } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateRemarkDto } from './dto/create-remark.dto';
import type { QueryRemarksDto } from './dto/query-remarks.dto';
import { PaginatedRemarksDto, RemarkItemDto } from './dto/remark-response.dto';

@Injectable()
export class RemarksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRemarkDto, userId: number): Promise<RemarkItemDto> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: dto.attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const remark = await this.prisma.remark.create({
      data: {
        attachment: { connect: { id: dto.attachmentId } },
        title: dto.title,
        message: dto.message,
        createdBy: { connect: { id: userId } },
      },
      include: {
        createdBy: true,
      },
    });

    return this.mapToDto(remark);
  }

  async listByAttachment(
    attachmentId: number,
    query: QueryRemarksDto,
  ): Promise<PaginatedRemarksDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const [items, totalCount] = await this.prisma.$transaction([
      this.prisma.remark.findMany({
        where: { attachmentId },
        include: {
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.remark.count({
        where: { attachmentId },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      data: items.map((item) => this.mapToDto(item)),
      meta: {
        totalCount,
        totalPages,
        page,
        limit,
      },
    };
  }

  private mapToDto(
    remark: Remark & {
      createdBy: User;
    },
  ): RemarkItemDto {
    return {
      id: remark.id,
      title: remark.title,
      message: remark.message,
      attachmentId: remark.attachmentId,
      user: {
        id: remark.createdBy.id,
        name: remark.createdBy.name,
        email: remark.createdBy.email,
      },
      createdAt: remark.createdAt.toISOString(),
      updatedAt: remark.updatedAt.toISOString(),
    };
  }
}
