import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VoteDto {
  @ApiProperty({ description: 'Selected poll option id' })
  @IsString()
  optionId: string;
}
