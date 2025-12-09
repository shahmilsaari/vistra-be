import { Injectable } from '@nestjs/common';
import type { Attachment, Prisma, User } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

export type AttachmentWithRelations = Attachment & {
  user: User;
  createdBy: User;
  updatedBy: User;
};

type FindManyArguments = {
  where: Prisma.AttachmentWhereInput;
  orderBy?: Prisma.AttachmentOrderByWithRelationInput;
  skip?: number;
  take?: number;
};

@Injectable()
export class AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(data: Prisma.AttachmentCreateManyInput[]) {
    await this.prisma.attachment.createMany({ data });
  }

  async findByStorageKeys(
    userId: number,
    storageKeys: string[],
  ): Promise<AttachmentWithRelations[]> {
    if (!storageKeys.length) {
      return [];
    }

    return this.prisma.attachment.findMany({
      where: {
        userId,
        storageKey: { in: storageKeys },
      },
      include: this.relationIncludes(),
    });
  }

  async find(options: FindManyArguments): Promise<AttachmentWithRelations[]> {
    return this.prisma.attachment.findMany({
      ...options,
      include: this.relationIncludes(),
    });
  }

  async count(where: Prisma.AttachmentWhereInput): Promise<number> {
    return this.prisma.attachment.count({ where });
  }

  async findById(id: number): Promise<AttachmentWithRelations | null> {
    return this.prisma.attachment.findUnique({
      where: { id },
      include: this.relationIncludes(),
    });
  }

  async updateById(
    id: number,
    data: Prisma.AttachmentUpdateInput,
  ): Promise<AttachmentWithRelations> {
    return this.prisma.attachment.update({
      where: { id },
      data,
      include: this.relationIncludes(),
    });
  }

  async findByPathId(pathId: number) {
    return this.prisma.attachment.findMany({
      where: { pathId },
      select: {
        id: true,
        storageKey: true,
      },
    });
  }

  private relationIncludes() {
    return {
      user: true,
      createdBy: true,
      updatedBy: true,
    };
  }
}
