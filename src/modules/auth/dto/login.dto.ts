import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@vistra.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'VistraStrongPass!2024' })
  @IsString()
  @MinLength(6)
  password: string;
}
