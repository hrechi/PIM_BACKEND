import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Updated full name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Sunny Farm', description: 'Updated farm name' })
  @IsOptional()
  @IsString()
  farmName?: string;

  @ApiPropertyOptional({ example: 'jane@example.com', description: 'Updated email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email' })
  email?: string;

  @ApiPropertyOptional({ example: '+21698765432', description: 'Updated phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'NewPass123', description: 'New password (min 6 characters)', minLength: 6 })
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsString()
  password?: string;
}
