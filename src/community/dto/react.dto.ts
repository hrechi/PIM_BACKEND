import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ReactionTypeDto {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

export class ReactDto {
  @ApiProperty({ enum: ReactionTypeDto, example: ReactionTypeDto.LIKE })
  @IsEnum(ReactionTypeDto)
  type: ReactionTypeDto;
}
