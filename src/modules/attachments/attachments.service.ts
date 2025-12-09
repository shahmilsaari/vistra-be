import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import type { Prisma } from '@prisma/client';
import { dirname, join } from 'path';
import { promises as fs } from 'fs';
import { PrismaService } from '../../core/database/prisma.service';
import { LogsService } from '../logs/logs.service';
import { QueryAttachmentsDto } from './dto/query-attachments.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { AttachmentDetailDto } from './dto/attachment-detail.dto';
import { AttachmentListItemDto, PaginatedAttachmentsDto } from './dto/attachment-response.dto';
import { DirectoryListItemDto } from './dto/directory-response.dto';
import { DirectoryAttachmentsDto } from './dto/directory-attachments-response.dto';
import { buildAttachmentOrderBy, buildAttachmentWhere } from './types/attachment-query.types';
import { QueryLogsDto } from '../logs/dto/query-logs.dto';
import {
  AttachmentsRepository,
  AttachmentWithRelations,
} from './repositories/attachments.repository';
import { ensureError, ensureErrnoException } from '../../common/utils/errors';

const DEFAULT_STORAGE_URL = `http://localhost:${process.env.PORT ?? 4000}`;
const UPLOAD_DIRECTORY = `${process.cwd()}/uploads`;

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachmentsRepository: AttachmentsRepository,
    private readonly configService: ConfigService,
    private readonly logsService: LogsService,
  ) {}

  private getFileKind(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    // Document extensions
    const documents = [
      'pdf',
      'doc',
      'docx',
      'txt',
      'rtf',
      'odt',
      'xls',
      'xlsx',
      'csv',
      'ppt',
      'pptx',
    ];
    if (documents.includes(ext)) return 'document';

    // Image extensions
    const images = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'];
    if (images.includes(ext)) return 'image';

    // Video extensions
    const videos = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v'];
    if (videos.includes(ext)) return 'video';

    // Audio extensions
    const audio = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];
    if (audio.includes(ext)) return 'audio';

    // Archive extensions
    const archives = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
    if (archives.includes(ext)) return 'archive';

    // Code extensions
    const code = [
      'js',
      'ts',
      'jsx',
      'tsx',
      'py',
      'java',
      'cpp',
      'c',
      'h',
      'css',
      'html',
      'json',
      'xml',
      'sql',
    ];
    if (code.includes(ext)) return 'code';

    // Default
    return 'file';
  }

  private async ensureUploadedFilesExist(files: Express.Multer.File[]) {
    await Promise.all(
      files.map(async (file) => {
        if (!file?.path) return;

        try {
          await fs.access(file.path);
        } catch {
          await fs.mkdir(dirname(file.path), { recursive: true });
          const contents = file.buffer ?? Buffer.alloc(0);
          await fs.writeFile(file.path, contents);
        }
      }),
    );
  }

  async createMultiple(
    userId: number,
    dto: UploadAttachmentDto,
    files: Express.Multer.File[],
  ): Promise<AttachmentListItemDto[]> {
    console.log('📝 Service: createMultiple called');

    await this.ensureUploadedFilesExist(files);

    const pathRecord = await this.resolveUploadPath(dto.pathId, dto.folder, userId);
    const path = pathRecord ? `/${pathRecord.name}` : '/';
    const pathId = pathRecord?.id ?? null;
    console.log(`📍 Path resolved: ${path}`);

    console.log(`🔄 Creating ${files.length} attachment(s)...`);

    // Prepare insert payload once to avoid per-file query overhead
    const records = files.map((file, index) => {
      const storageKey = `uploads/${file.filename}`;
      const kind = this.getFileKind(file.originalname);

      console.log(`  ${index + 1}. Queued: ${file.originalname} (kind: ${kind})`);

      return {
        name: file.originalname,
        kind,
        size: file.size,
        mime: file.mimetype,
        storageKey,
        path,
        pathId,
        userId,
        createdById: userId,
        updatedById: userId,
      };
    });

    // Single transaction: bulk insert + fetch with relations to cut round trips
    await this.attachmentsRepository.createMany(records);
    const created = await this.attachmentsRepository.findByStorageKeys(
      userId,
      records.map((record) => record.storageKey),
    );

    const createdMap = new Map(created.map((attachment) => [attachment.storageKey, attachment]));

    const attachments = records
      .map((record) => createdMap.get(record.storageKey))
      .filter((attachment): attachment is AttachmentWithRelations => Boolean(attachment));

    console.log(`✅ Created ${attachments.length} attachment(s)`);
    console.log('📋 Creating activity logs...');

    // Create logs in parallel (fire and forget for better performance)
    Promise.all(
      attachments.map((attachment) =>
        this.logsService.recordAction({
          action: 'attachment.upload',
          detail: `Uploaded ${attachment.name} to ${path}`,
          userId,
          attachmentId: attachment.id,
        }),
      ),
    )
      .then(() => {
        console.log('✅ Activity logs created');
      })
      .catch((error: unknown) => {
        const logError = ensureError(error);
        console.error('❌ Failed to create upload logs:', logError.message);
      });

    console.log('🎉 Mapping results to DTOs...');
    const results = attachments.map((attachment) => this.mapToDto(attachment));
    console.log(`✅ Service completed successfully`);

    return results;
  }

  async list(query: QueryAttachmentsDto): Promise<PaginatedAttachmentsDto> {
    const directoriesPromise = this.listDirectories();
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const folderPathId =
      query.folder !== undefined ? await this.getPathIdForFolder(query.folder) : null;
    const pathIdFilter = query.pathId ?? (query.folder ? (folderPathId ?? -1) : null);
    const where = buildAttachmentWhere({
      pathId: pathIdFilter,
      kind: query.kind,
      search: query.search,
    });

    const orderBy = buildAttachmentOrderBy({
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const [items, totalCount] = await Promise.all([
      this.attachmentsRepository.find({ where, orderBy, skip, take: limit }),
      this.attachmentsRepository.count(where),
    ]);

    const directories = await directoriesPromise;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      directories,
      data: items.map((item) => this.mapToDto(item)),
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  async listByDirectory(
    folder: string,
    query: QueryAttachmentsDto,
  ): Promise<DirectoryAttachmentsDto> {
    const folderName = this.ensureValidFolderName(folder);
    const pathRecord = await this.prisma.path.findFirst({
      where: {
        name: folderName,
      },
    });

    if (!pathRecord) {
      throw new NotFoundException('Directory not found');
    }

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = buildAttachmentWhere({
      pathId: pathRecord.id,
      kind: query.kind,
      search: query.search,
    });

    const orderBy = buildAttachmentOrderBy({
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    const [items, totalCount] = await Promise.all([
      this.attachmentsRepository.find({ where, orderBy, skip, take: limit }),
      this.attachmentsRepository.count(where),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return {
      data: items.map((item) => this.mapToDto(item)),
      meta: {
        totalCount,
        page,
        limit,
        totalPages,
      },
    };
  }

  async update(
    id: number,
    dto: UpdateAttachmentDto,
    userId: number,
  ): Promise<AttachmentListItemDto> {
    if (!dto.name && !dto.pathId && !dto.folder) {
      throw new BadRequestException('Provide a name, pathId, or folder to update');
    }

    if (dto.pathId && dto.folder) {
      throw new BadRequestException('Use either pathId or folder, not both');
    }

    const attachment = await this.attachmentsRepository.findById(id);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this attachment');
    }

    let nextPathId = attachment.pathId ?? null;
    let nextPath = attachment.path;
    let pathChanged = false;

    if (dto.pathId !== undefined || dto.folder) {
      const pathRecord = await this.resolveUploadPath(dto.pathId, dto.folder, userId);
      nextPathId = pathRecord?.id ?? null;
      nextPath = pathRecord ? `/${pathRecord.name}` : '/';
      pathChanged = nextPath !== attachment.path || nextPathId !== attachment.pathId;
    }

    const nameChanged = dto.name !== undefined && dto.name !== attachment.name;

    if (!nameChanged && !pathChanged) {
      throw new BadRequestException('No changes detected for attachment');
    }

    const data: Prisma.AttachmentUpdateInput = {
      updatedBy: { connect: { id: userId } },
    };

    if (nameChanged) {
      data.name = dto.name;
    }

    if (pathChanged) {
      if (nextPathId) {
        data.pathRecord = { connect: { id: nextPathId } };
      } else {
        data.pathRecord = { disconnect: true };
      }
      data.path = nextPath;
    }

    const updated = await this.attachmentsRepository.updateById(id, data);

    const changes: string[] = [];
    if (nameChanged) {
      changes.push(`name: ${attachment.name} -> ${dto.name}`);
    }
    if (pathChanged) {
      changes.push(`path: ${attachment.path} -> ${nextPath}`);
    }

    this.logsService
      .recordAction({
        action: 'attachment.update',
        detail: changes.length
          ? `Updated ${updated.name} (${changes.join(', ')})`
          : `Updated ${updated.name}`,
        userId,
        attachmentId: updated.id,
      })
      .catch((error: unknown) => {
        const logError = ensureError(error);
        console.warn(`⚠️ Failed to record update log: ${logError.message}`);
      });

    return this.mapToDto(updated);
  }

  async deleteDirectory(folder: string, userId: number) {
    const folderName = this.ensureValidFolderName(folder);
    const pathRecord = await this.prisma.path.findFirst({
      where: {
        name: folderName,
        ownerId: userId,
      },
    });

    if (!pathRecord) {
      throw new NotFoundException('Directory not found');
    }

    const attachments = await this.attachmentsRepository.findByPathId(pathRecord.id);

    await Promise.all(
      attachments.map(async (attachment) => {
        const diskPath = join(process.cwd(), attachment.storageKey);
        try {
          await fs.unlink(diskPath);
        } catch (error: unknown) {
          const fsError = ensureErrnoException(error);
          if (fsError.code !== 'ENOENT') {
            console.warn(`⚠️ Failed to remove file ${attachment.storageKey}: ${fsError.message}`);
          }
        }
      }),
    );

    const attachmentIds = attachments.map((item) => item.id);

    await this.prisma.$transaction(async (tx) => {
      if (attachmentIds.length) {
        await tx.remark.deleteMany({ where: { attachmentId: { in: attachmentIds } } });
        await tx.attachment.deleteMany({ where: { id: { in: attachmentIds } } });
      }

      await tx.path.delete({ where: { id: pathRecord.id } });
    });

    try {
      await fs.rm(join(UPLOAD_DIRECTORY, folderName), { recursive: true, force: true });
    } catch (error: unknown) {
      const fsError = ensureError(error);
      console.warn(`⚠️ Failed to remove directory: ${fsError.message}`);
    }

    await this.logsService.recordAction({
      action: 'folder.delete',
      detail: `Deleted folder /${folderName}`,
      userId,
    });

    return {
      folder: `/${folderName}`,
      deletedFiles: attachments.length,
    };
  }

  private async listDirectories(): Promise<DirectoryListItemDto[]> {
    const paths = await this.prisma.path.findMany({
      include: {
        owner: true,
        _count: {
          select: { attachments: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return paths.map((path) => ({
      name: path.name,
      path: `/${path.name}`,
      diskPath: join(UPLOAD_DIRECTORY, path.name),
      itemCount: path._count.attachments,
      createdAt: path.createdAt.toISOString(),
      updatedAt: path.updatedAt.toISOString(),
      createdBy: {
        id: path.owner.id,
        name: path.owner.name,
        email: path.owner.email,
      },
    }));
  }

  private async resolveUploadPath(pathId?: number, folder?: string, userId?: number) {
    if (pathId) {
      const path = await this.prisma.path.findUnique({
        where: { id: pathId },
      });

      if (!path) {
        throw new NotFoundException('Path not found');
      }

      if (userId && path.ownerId !== userId) {
        throw new ForbiddenException('You do not have permission to upload to this path');
      }

      return path;
    }

    if (folder) {
      return this.ensurePathWithFolder(folder, userId ?? 0);
    }

    return null;
  }

  private async getPathIdForFolder(folder: string): Promise<number | null> {
    const normalized = this.ensureValidFolderName(folder);
    const path = await this.prisma.path.findFirst({
      where: { name: normalized },
      orderBy: { createdAt: 'desc' },
    });

    return path?.id ?? null;
  }

  private async ensurePathWithFolder(folderName: string, userId: number) {
    const normalized = this.ensureValidFolderName(folderName);

    const existing = await this.prisma.path.findFirst({
      where: {
        ownerId: userId,
        name: normalized,
      },
    });

    if (existing) {
      return existing;
    }

    const path = await this.prisma.path.create({
      data: {
        name: normalized,
        owner: { connect: { id: userId } },
      },
    });

    await this.logsService.recordAction({
      action: 'folder.create',
      detail: `Created folder /${normalized}`,
      userId,
    });

    return path;
  }

  private ensureValidFolderName(folder: string): string {
    const normalized = folder?.trim() ?? '';
    if (!normalized) {
      throw new BadRequestException('Folder name is required');
    }

    if (normalized.includes('/') || normalized.includes('\\') || normalized.includes('..')) {
      throw new BadRequestException('Nested folders are not allowed; provide a single folder name');
    }

    return normalized;
  }

  async findOneWithLogs(id: number, query?: QueryLogsDto): Promise<AttachmentDetailDto> {
    const attachment = await this.attachmentsRepository.findById(id);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    const logs = await this.logsService.list({
      ...(query ?? {}),
      attachmentId: id,
    });

    return {
      attachment: this.mapToDto(attachment),
      logs,
    };
  }

  private buildStorageUrl(key: string) {
    const baseUrl = this.configService.get<string>('STORAGE_BASE_URL') ?? DEFAULT_STORAGE_URL;
    const cleanedBase = baseUrl.replace(/\/$/, '');
    const cleanedKey = key.replace(/^\/+/, '');
    return `${cleanedBase}/${cleanedKey}`;
  }

  private mapToDto(attachment: AttachmentWithRelations): AttachmentListItemDto {
    return {
      id: attachment.id,
      name: attachment.name,
      kind: attachment.kind,
      size: attachment.size,
      mime: attachment.mime,
      storageKey: attachment.storageKey,
      storageUrl: this.buildStorageUrl(attachment.storageKey),
      path: attachment.path,
      owner: {
        id: attachment.user.id,
        name: attachment.user.name,
        email: attachment.user.email,
      },
      createdBy: {
        id: attachment.createdBy.id,
        name: attachment.createdBy.name,
      },
      updatedBy: {
        id: attachment.updatedBy.id,
        name: attachment.updatedBy.name,
      },
      createdAt: attachment.createdAt.toISOString(),
      updatedAt: attachment.updatedAt.toISOString(),
    };
  }

  async createFolder(dto: CreateFolderDto, userId: number) {
    const folderName = this.ensureValidFolderName(dto.folder);
    const path = await this.ensurePathWithFolder(folderName, userId);

    return {
      folder: `/${folderName}`,
      diskPath: join(UPLOAD_DIRECTORY, folderName),
      pathId: path.id,
    };
  }

  async deleteAttachment(id: number, userId: number) {
    const attachment = await this.attachmentsRepository.findById(id);

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this attachment');
    }

    const diskPath = join(process.cwd(), attachment.storageKey);
    try {
      await fs.unlink(diskPath);
    } catch (error: unknown) {
      const fsError = ensureErrnoException(error);
      if (fsError.code !== 'ENOENT') {
        console.warn(`⚠️ Failed to remove file from disk: ${fsError.message}`);
      }
    }

    const deleted = await this.prisma.$transaction(async (tx) => {
      // Remove dependent remarks first to avoid FK violations on attachment delete
      await tx.remark.deleteMany({ where: { attachmentId: id } });

      return tx.attachment.delete({
        where: { id },
        include: {
          user: true,
          createdBy: true,
          updatedBy: true,
        },
      });
    });

    // Log without attachment relation to avoid P2025 after deletion
    this.logsService
      .recordAction({
        action: 'attachment.delete',
        detail: `Deleted ${deleted.name}`,
        userId,
      })
      .catch((error: unknown) => {
        const logError = ensureError(error);
        console.warn(`⚠️ Failed to record delete log: ${logError.message}`);
      });

    return this.mapToDto(deleted);
  }
}
