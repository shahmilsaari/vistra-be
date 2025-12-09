import type { Prisma } from '@prisma/client';

export type AttachmentSortBy = 'name' | 'size' | 'createdAt' | 'updatedAt';
export type AttachmentSortOrder = 'asc' | 'desc';

export type AttachmentFilterParams = {
  pathId: number | null;
  kind?: string;
  search?: string;
};

export type AttachmentOrderOptions = {
  sortBy?: AttachmentSortBy;
  sortOrder?: AttachmentSortOrder;
};

export const buildAttachmentWhere = ({
  pathId,
  kind,
  search,
}: AttachmentFilterParams): Prisma.AttachmentWhereInput => {
  const where: Prisma.AttachmentWhereInput = {};

  if (pathId !== undefined) {
    where.pathId = pathId;
  }

  if (kind) {
    where.kind = kind;
  }

  const term = search?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term } },
      { mime: { contains: term } },
      { path: { contains: term } },
    ];
  }

  return where;
};

export const buildAttachmentOrderBy = ({
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: AttachmentOrderOptions = {}): Prisma.AttachmentOrderByWithRelationInput => ({
  [sortBy]: sortOrder,
});
