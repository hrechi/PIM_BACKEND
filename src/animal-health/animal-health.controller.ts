import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnimalHealthService } from './animal-health.service';

@Controller('animal-health')
@UseGuards(JwtAuthGuard)
export class AnimalHealthController {
  constructor(private readonly svc: AnimalHealthService) {}

  /** Ping FastAPI — vérifie que le modèle IA est up */
  @Get('ai-status')
  pingAI() {
    return this.svc.pingAI();
  }

  /** Diagnostiquer UN animal par son id */
  @Post('diagnose/:animalId')
  diagnose(@Param('animalId') animalId: string, @Req() req: any) {
    return this.svc.diagnose(animalId, req.user.id);
  }

  /** Diagnostiquer TOUS les animaux actifs du fermier connecté */
  @Post('diagnose-all')
  diagnoseAll(@Req() req: any) {
    // Bug 3 fix — chaque fermier ne peut diagnostiquer QUE ses propres animaux
    // Le cron utilise diagnoseAllInternal() directement, jamais cet endpoint
    return this.svc.diagnoseAll(req.user.id);
  }

  /** Dernières alertes santé du fermier */
  @Get('alerts')
  getAlerts(@Req() req: any, @Query('limit') limit?: string) {
    return this.svc.getAlerts(req.user.id, limit ? parseInt(limit) : 20);
  }

  /** Lectures capteurs d'un animal (pour graphiques) */
  @Get('sensors/:animalId')
  getSensors(
    @Param('animalId') animalId: string,
    @Req() req: any,
    @Query('hours') hours?: string,
  ) {
    return this.svc.getSensorReadings(
      animalId,
      req.user.id,
      hours ? parseInt(hours) : 24,
    );
  }

  /** Historique capteurs avec agrégation horaire + zones d'alerte */
  @Get('sensors/:animalId/history')
  getSensorHistory(
    @Param('animalId') animalId: string,
    @Req() req: any,
    @Query('period') period?: string,
  ) {
    return this.svc.getSensorHistory(
      animalId,
      req.user.id,
      period ? parseInt(period) : 24,
    );
  }

  /** Historique de santé d'un animal avec tendances */
  @Get('history/:animalId')
  getHistory(
    @Param('animalId') animalId: string,
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    return this.svc.getHealthHistory(
      animalId,
      req.user.id,
      days ? parseInt(days) : 7,
    );
  }

  /** Dashboard du troupeau — statistiques agrégées */
  @Get('herd-dashboard')
  getHerdDashboard(@Req() req: any) {
    return this.svc.getHerdDashboard(req.user.id);
  }

  // ── Weight records ──────────────────────────────────────────────────────

  /** Historique de poids avec tendance et alerte perte > 10% */
  @Get('weight/:animalId')
  getWeightHistory(
    @Param('animalId') animalId: string,
    @Req() req: any,
    @Query('days') days?: string,
  ) {
    return this.svc.getWeightHistory(
      animalId,
      req.user.id,
      days ? parseInt(days) : 90,
    );
  }

  /** Ajouter une mesure de poids */
  @Post('weight/:animalId')
  addWeight(
    @Param('animalId') animalId: string,
    @Req() req: any,
    @Body() body: { weightKg: number; measuredBy?: string; measuredDate?: string },
  ) {
    return this.svc.addWeightRecord(
      animalId,
      req.user.id,
      body.weightKg,
      body.measuredBy,
      body.measuredDate,
    );
  }

  /** Supprimer une mesure de poids */
  @Delete('weight/record/:recordId')
  deleteWeight(@Param('recordId') recordId: string, @Req() req: any) {
    return this.svc.deleteWeightRecord(recordId, req.user.id);
  }
}
