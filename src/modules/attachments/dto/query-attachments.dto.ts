import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, IsIn, Matches } from 'class-validator';

export class QueryAttachmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pathId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[^\\/]+$/)
  folder?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'size', 'createdAt', 'updatedAt'])
  sortBy?: 'name' | 'size' | 'createdAt' | 'updatedAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
