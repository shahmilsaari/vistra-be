import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Delete,
  Param,
  ParseIntPipe,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'node:fs';
import type { Express } from 'express';
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from '../users/interfaces/jwt-payload.interface';
import { AttachmentsService } from './attachments.service';
import { QueryAttachmentsDto } from './dto/query-attachments.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { QueryLogsDto } from '../logs/dto/query-logs.dto';

const UPLOAD_DIRECTORY = `${process.cwd()}/uploads`;
if (!existsSync(UPLOAD_DIRECTORY)) {
  mkdirSync(UPLOAD_DIRECTORY, { recursive: true });
}

const diskStorageConfig = diskStorage({
  destination: UPLOAD_DIRECTORY,
  filename: (_, file, cb) => {
    const uniqueSegment = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSegment}${extname(file.originalname)}`);
  },
});

@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorageConfig,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file
        files: 10, // Max 10 files
      },
      fileFilter: (req, file, cb) => {
        console.log(`📁 Receiving file: ${file.originalname} (${file.mimetype})`);
        // Accept all file types
        cb(null, true);
      },
    }),
  )
  async upload(
    @Body() dto: UploadAttachmentDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: JwtPayload,
  ) {
    console.log('🚀 Upload request started');
    console.log(`👤 User ID: ${user.sub}`);
    console.log(`📂 Path ID: ${dto.pathId ?? '(root)'}`);
    console.log(`📦 Files received: ${files?.length || 0}`);

    if (!files || files.length === 0) {
      console.error('❌ No files provided');
      throw new BadRequestException('At least one file is required for upload');
    }

    // Log file details
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.originalname} - ${(file.size / 1024).toFixed(2)} KB`);
    });

    try {
      console.log('💾 Starting database operations...');
      const result = await this.attachmentsService.createMultiple(Number(user.sub), dto, files);
      console.log(`✅ Upload completed successfully! ${result.length} file(s) saved`);
      return result;
    } catch (error) {
      console.error('❌ Upload failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  @Get()
  list(@Query() query: QueryAttachmentsDto) {
    return this.attachmentsService.list(query);
  }

  @Get('directory/:folder')
  listByDirectory(@Param('folder') folder: string, @Query() query: QueryAttachmentsDto) {
    return this.attachmentsService.listByDirectory(folder, query);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @Query() logsQuery?: QueryLogsDto) {
    return this.attachmentsService.findOneWithLogs(id, logsQuery);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttachmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.attachmentsService.update(id, dto, Number(user.sub));
  }

  @Post('folders')
  createFolder(@Body() dto: CreateFolderDto, @CurrentUser() user: JwtPayload) {
    return this.attachmentsService.createFolder(dto, Number(user.sub));
  }

  @Delete('directory/:folder')
  deleteDirectory(@Param('folder') folder: string, @CurrentUser() user: JwtPayload) {
    return this.attachmentsService.deleteDirectory(folder, Number(user.sub));
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.attachmentsService.deleteAttachment(id, Number(user.sub));
  }
}
