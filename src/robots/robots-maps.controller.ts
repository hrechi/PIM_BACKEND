import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface SaveMapDto {
  /** PNG data, base64-encoded (no data URL prefix). */
  pngBase64: string;
  /** Resolution in metres per cell. */
  resolution: number;
  /** Grid width in cells. */
  cols: number;
  /** Grid height in cells. */
  rows: number;
  /** Optional human label. */
  label?: string;
}

interface MapMetadata {
  id: string;
  robotId: string;
  resolution: number;
  cols: number;
  rows: number;
  label?: string;
  createdAt: string;
  pngFile: string;
}

const MAPS_ROOT = path.resolve(process.cwd(), 'uploads', 'robot-maps');

function robotDir(robotId: string): string {
  // Defend against path traversal — robotId must be alphanumeric/dash.
  if (!/^[A-Za-z0-9_\-]+$/.test(robotId)) {
    throw new HttpException('Invalid robotId', HttpStatus.BAD_REQUEST);
  }
  return path.join(MAPS_ROOT, robotId);
}

@Controller('robots')
@UseGuards(JwtAuthGuard)
export class RobotsMapsController {
  @Post(':id/maps')
  async saveMap(
    @Param('id') robotId: string,
    @Body() dto: SaveMapDto,
  ): Promise<MapMetadata> {
    if (!dto?.pngBase64) {
      throw new HttpException('pngBase64 required', HttpStatus.BAD_REQUEST);
    }
    const dir = robotDir(robotId);
    await fs.promises.mkdir(dir, { recursive: true });

    const id = `map_${Date.now()}`;
    const pngFile = `${id}.png`;
    const jsonFile = `${id}.json`;

    // Strip optional data URL prefix.
    const base64 = dto.pngBase64.replace(/^data:image\/png;base64,/, '');
    let pngBytes: Buffer;
    try {
      pngBytes = Buffer.from(base64, 'base64');
    } catch {
      throw new HttpException('Invalid base64 PNG', HttpStatus.BAD_REQUEST);
    }
    await fs.promises.writeFile(path.join(dir, pngFile), pngBytes);

    const metadata: MapMetadata = {
      id,
      robotId,
      resolution: dto.resolution,
      cols: dto.cols,
      rows: dto.rows,
      label: dto.label,
      createdAt: new Date().toISOString(),
      pngFile,
    };
    await fs.promises.writeFile(
      path.join(dir, jsonFile),
      JSON.stringify(metadata, null, 2),
      'utf-8',
    );
    return metadata;
  }

  @Get(':id/maps')
  async listMaps(@Param('id') robotId: string): Promise<MapMetadata[]> {
    const dir = robotDir(robotId);
    if (!fs.existsSync(dir)) return [];
    const entries = await fs.promises.readdir(dir);
    const out: MapMetadata[] = [];
    for (const name of entries) {
      if (!name.endsWith('.json')) continue;
      try {
        const raw = await fs.promises.readFile(path.join(dir, name), 'utf-8');
        out.push(JSON.parse(raw) as MapMetadata);
      } catch {
        // skip corrupt entries
      }
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  @Get(':id/maps/:mapId/png')
  getPng(
    @Param('id') robotId: string,
    @Param('mapId') mapId: string,
    @Res() res: Response,
  ): void {
    if (!/^map_\d+$/.test(mapId)) {
      throw new HttpException('Invalid mapId', HttpStatus.BAD_REQUEST);
    }
    const file = path.join(robotDir(robotId), `${mapId}.png`);
    if (!fs.existsSync(file)) {
      throw new HttpException('Map not found', HttpStatus.NOT_FOUND);
    }
    res.setHeader('Content-Type', 'image/png');
    fs.createReadStream(file).pipe(res);
  }
}
