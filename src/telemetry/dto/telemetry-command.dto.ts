import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export const TELEMETRY_COMMANDS = [
  'forward',
  'backward',
  'left',
  'right',
  'stop',
] as const;

export type TelemetryCommand = (typeof TELEMETRY_COMMANDS)[number];

export class TelemetryCommandDto {
  @IsString()
  @IsNotEmpty()
  robotId: string;

  @IsIn(TELEMETRY_COMMANDS as unknown as string[])
  command: TelemetryCommand;

  @IsNumber()
  linear: number;

  @IsNumber()
  angular: number;

  @IsISO8601()
  timestamp: string;
}
