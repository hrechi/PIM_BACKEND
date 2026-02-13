import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Green Farm', description: 'Name of the farm' })
  @IsNotEmpty({ message: 'Farm name is required' })
  @IsString()
  farmName: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Email address (required if phone is not provided)' })
  @ValidateIf((o) => !o.phone)
  @IsNotEmpty({ message: 'Email is required when phone is not provided' })
  @IsEmail({}, { message: 'Please provide a valid email' })
  email?: string;

  @ApiPropertyOptional({ example: '+21612345678', description: 'Phone number (required if email is not provided)' })
  @ValidateIf((o) => !o.email)
  @IsNotEmpty({ message: 'Phone is required when email is not provided' })
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Pass1234', description: 'Password (min 6 characters)', minLength: 6 })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsString()
  password: string;
}
