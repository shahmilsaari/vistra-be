import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString, Matches } from 'class-validator';

export class UploadAttachmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pathId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[^\\/]+$/)
  folder?: string;
}
