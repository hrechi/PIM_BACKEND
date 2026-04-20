import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddStaffDto {
  @ApiProperty({
    example: 'Ahmed Ben Ali',
    description: 'Full name of the staff member',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'farmer.ahmed', description: 'Unique username for worker login' })
  @IsNotEmpty({ message: 'Username is required' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'Farmer@123', description: 'Login password for worker account' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'WORKER', required: false, description: 'Worker role (defaults to WORKER)' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', required: false, description: 'Field assigned to this worker' })
  @IsOptional()
  @IsString()
  assignedFieldId?: string;
}
