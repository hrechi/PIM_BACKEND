import { IsNotEmpty, IsString } from 'class-validator';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  type: string; // 'intruder' or 'animal'
}
