import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TelemetryCommandDto } from './dto/telemetry-command.dto';

@Controller('telemetry')
@UseGuards(JwtAuthGuard)
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  @Post('command')
  @HttpCode(HttpStatus.ACCEPTED)
  logCommand(@Req() req: any, @Body() dto: TelemetryCommandDto) {
    const userId = req.user?.id ?? 'unknown';

    // TODO: Persist to a `RobotCommandLog` Prisma table once the audit
    // requirements (retention, search, per-robot views) are settled.
    this.logger.log(
      JSON.stringify({
        kind: 'robot.command',
        userId,
        robotId: dto.robotId,
        command: dto.command,
        linear: dto.linear,
        angular: dto.angular,
        clientTimestamp: dto.timestamp,
        serverTimestamp: new Date().toISOString(),
      }),
    );

    return { ok: true };
  }
}
