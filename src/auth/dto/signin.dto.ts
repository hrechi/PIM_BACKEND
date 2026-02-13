import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email address or phone number' })
  @IsNotEmpty({ message: 'Email or phone is required' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'Pass1234', description: 'Account password', minLength: 6 })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6)
  @IsString()
  password: string;
}
