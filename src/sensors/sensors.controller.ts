import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { IsString, IsInt, IsOptional, Min, Max } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SensorSimulatorService, SimulatorScenario } from './sensor-simulator.service';
import { PrismaService } from '../prisma/prisma.service';

class SimulateDto {
  @IsString()
  animalId: string;

  @IsString()
  scenario: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}

@Controller('sensors')
@UseGuards(JwtAuthGuard)
export class SensorsController {
  constructor(
    private readonly simulator: SensorSimulatorService,
    private readonly prisma: PrismaService,
  ) {}

  /** Vérifie que l'animal appartient au fermier connecté */
  private async checkOwnership(animalId: string, farmerId: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, farmerId },
    });
    if (!animal) {
      throw new ForbiddenException('Animal introuvable ou accès refusé');
    }
    return animal;
  }

  /** Génère UNE lecture et la sauvegarde */
  @Post('simulate')
  async simulate(@Body() dto: SimulateDto, @Req() req: any) {
    await this.checkOwnership(dto.animalId, req.user.id);
    return this.simulator.saveReading(dto.animalId, (dto.scenario ?? 'saine') as SimulatorScenario);
  }

  /** Génère N jours d'historique (pour bootstrapper un animal) */
  @Post('simulate/history')
  async generateHistory(@Body() dto: SimulateDto, @Req() req: any) {
    await this.checkOwnership(dto.animalId, req.user.id);
    return this.simulator.generateHistory(
      dto.animalId,
      (dto.scenario ?? 'saine') as SimulatorScenario,
      dto.days ?? 7,
    );
  }

  /** Dernières lectures capteurs d'un animal */
  @Get(':animalId/recent')
  async getRecent(
    @Param('animalId') animalId: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    await this.checkOwnership(animalId, req.user.id);
    const take = limit ? +limit : 20;
    return this.prisma.sensorReading.findMany({
      where: { animalId },
      orderBy: { timestamp: 'desc' },
      take,
    });
  }

  /** Supprime toutes les lectures d'un animal (utile pour reset tests) */
  @Delete(':animalId/clear')
  async clear(@Param('animalId') animalId: string, @Req() req: any) {
    await this.checkOwnership(animalId, req.user.id);
    const { count } = await this.prisma.sensorReading.deleteMany({
      where: { animalId },
    });
    return { deleted: count };
  }
}
