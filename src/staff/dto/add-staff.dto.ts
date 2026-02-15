import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddStaffDto {
  @ApiProperty({ example: 'Ahmed Ben Ali', description: 'Full name of the staff member' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;
}
