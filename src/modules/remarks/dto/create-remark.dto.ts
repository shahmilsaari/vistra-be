import { IsInt, IsNotEmpty, Min, IsString } from 'class-validator';

export class CreateRemarkDto {
  @IsInt()
  @Min(1)
  attachmentId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
