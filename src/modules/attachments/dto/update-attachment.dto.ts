import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class UpdateAttachmentDto {
  @IsOptional()
  @IsString()
  name?: string;

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
