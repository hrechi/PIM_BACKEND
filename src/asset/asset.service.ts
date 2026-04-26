import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { spawn } from 'child_process';
import { ConfigService } from '@nestjs/config';
import { AssetStatus } from '@prisma/client';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { EndAssetSessionDto, SessionCondition } from './dto/end-asset-session.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Inject, forwardRef } from '@nestjs/common';
import { AiValidationService } from '../ai/ai-validation.service';
import { AssetMaintenanceNotificationService } from './asset-maintenance-notification.service';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';

type MechanicalAnalysis = {
  brand: string;
  model?: string | null;
  modelYear?: number | null;
  failureProbability: number;
  riskPercentage: number;
  criticalComponent: string;
  maintenanceProTip: string;
  technicalBulletin: string;
  serviceIntervalKm: number | null;
  serviceIntervalHours: number | null;
  source: 'external-kb' | 'local-kb';
};

const BRAND_CATALOG = [
  'John Deere',
  'Massey Ferguson',
  'New Holland',
  'Landini',
  'Kubota',
  'Claas',
  'Fendt',
  'Case IH',
  'Valtra',
  'Deutz-Fahr',
  'Lamborghini Trattori',
  'Same',
  'Buhler',
  'Mitsubishi',
  'Mahindra',
  'Yanmar',
  'Iseki',
  'Shibaura',
  'Solis',
  'Tafe',
  'Zetor',
  'Massey Harris',
  'McCormick',
  'Antonio Carraro',
  'Kioti',
  'LS Tractor',
  'Hinomoto',
  'YTO',
  'Challenger',
  'Ford',
  'International Harvester',
  'Agco',
  'Ariens',
  'Branson',
  'BCS',
  'BCS Ferrari',
  'BCS Pasquali',
  'Bellota',
  'Bobcat',
  'Buhler Versatile',
  'Caterpillar',
  'Case',
  'David Brown',
  'Dongfeng',
  'Farmall',
  'Goldoni',
  'Hürlimann',
  'JCB',
  'Lovol',
  'Massey Tyler',
  'New Idea',
  'Steyr',
  'White',
  'YTO-X',
].sort((a, b) => a.localeCompare(b));

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => AiValidationService))
    private readonly aiValidationService: AiValidationService,
    private readonly assetMaintenanceNotificationService: AssetMaintenanceNotificationService,
    private readonly predictiveMaintenanceService: PredictiveMaintenanceService,
  ) {}

  async create(userId: string, dto: CreateAssetDto) {
    const serialNumber = dto.serial_number.trim();
    const brandResolution = this.resolveBrand(dto.brand);

    const existing = await this.prisma.asset.findUnique({
      where: {
        userId_serialNumber: {
          userId,
          serialNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Serial number already exists for this account');
    }

    // AI validation step
    let aiValidationResult: any = null;
    try {
      aiValidationResult = await this.aiValidationService.validateAsset({
        name: dto.name,
        type: dto.category,
        horsepower: dto.operatingHours, // or another field if you have horsepower
        usage: dto.mileage,
        brand: dto.brand,
        model: dto.model,
        modelYear: dto.modelYear,
      });

      if (aiValidationResult && aiValidationResult.valid === false) {
        throw new BadRequestException({
          message: 'Asset validation failed',
          issues: aiValidationResult.issues,
          suggestions: aiValidationResult.suggestions,
        });
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      // Fallback: rule-based validation (simple example)
      if (
        dto.operatingHours && (dto.operatingHours < 0 || dto.operatingHours > 100000) ||
        (dto.mileage && dto.mileage < 0)
      ) {
        throw new BadRequestException('Unrealistic operating hours or mileage');
      }
    }

    // Assets must always belong to a field owned by the current user.
    const field = await this.prisma.field.findFirst({
      where: { id: dto.field_id, userId },
    });

    if (!field) {
      throw new BadRequestException('Field not found for current user');
    }

    let assignedStaffId: string | null = null;
    if (dto.assignedTo) {
      const staff = await this.prisma.whitelistStaff.findFirst({
        where: { id: dto.assignedTo, userId },
      });
      if (!staff) {
        throw new BadRequestException('Assigned staff not found for current user');
      }
      assignedStaffId = staff.id;
    }

    // Build the data object conditionally
    const createData: any = {
      userId,
      name: dto.name.trim(),
      brand: brandResolution.label,
      model: dto.model?.trim() || null,
      modelYear: dto.modelYear ?? null,
      mileage: dto.mileage ?? null,
      operatingHours: dto.operatingHours ?? null,
      category: dto.category.trim(),
      status: dto.status ?? AssetStatus.AVAILABLE,
      imageUrl: dto.image_url?.trim() || null,
      serialNumber,
      lastServiceDate: dto.last_service_date
        ? new Date(dto.last_service_date)
        : null,
      assignedToId: assignedStaffId,
      fieldId: dto.field_id,
    };

    const asset = await (this.prisma as any).asset.create({
      data: createData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            imagePath: true,
          },
        },
        field: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...this.sanitize(asset),
      diagnosis: await this.buildMechanicalAnalysis(asset, dto.model || null),
      brandValidation: brandResolution,
      aiValidation: aiValidationResult,
    };
  }

  async findAll(
    ownerId: string,
    role: string = 'OWNER',
    assignedFieldId?: string | null,
    staffId?: string | null,
  ) {
    const where: any = { userId: ownerId };

    if (role === 'WORKER' || role === 'FARMER') {
      const workerFilters: any[] = [];

      if (assignedFieldId) {
        workerFilters.push({ fieldId: assignedFieldId });
      }

      if (staffId) {
        workerFilters.push({ assignedToId: staffId });
      }

      if (!workerFilters.length) {
        return [];
      }

      where.AND = [{ OR: workerFilters }];
    }

    const assets = await (this.prisma as any).asset.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            imagePath: true,
          },
        },
        field: {
          select: {
            id: true,
            name: true,
          },
        },
        usageLogs: {
          orderBy: { startTime: 'desc' },
          take: 1,
          include: {
            farmer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return assets without diagnosis on list load (load diagnosis on-demand)
    return assets.map((asset: any) => this.sanitize(asset));
  }

  async update(userId: string, assetId: string, dto: UpdateAssetDto) {
    const asset = await (this.prisma as any).asset.findFirst({
      where: { id: assetId, userId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // AI validation step (if relevant fields are present)
    let aiValidationResult: any = null;
    if (dto.brand || dto.model || dto.modelYear || dto.operatingHours || dto.mileage || dto.image_url !== undefined) {
      try {
        aiValidationResult = await this.aiValidationService.validateAsset({
          name: asset.name,
          type: asset.category,
          horsepower: dto.operatingHours ?? asset.operatingHours,
          usage: dto.mileage ?? asset.mileage,
          brand: dto.brand ?? asset.brand,
          model: dto.model ?? asset.model,
          modelYear: dto.modelYear ?? asset.modelYear,
        });

        if (aiValidationResult && aiValidationResult.valid === false) {
          throw new BadRequestException({
            message: 'Asset validation failed',
            issues: aiValidationResult.issues,
            suggestions: aiValidationResult.suggestions,
          });
        }
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }

        // Fallback: rule-based validation (simple example)
        const opHours = dto.operatingHours ?? asset.operatingHours;
        const mileage = dto.mileage ?? asset.mileage;
        if (
          opHours && (opHours < 0 || opHours > 100000) ||
          (mileage && mileage < 0)
        ) {
          throw new BadRequestException('Unrealistic operating hours or mileage');
        }
      }
    }

    const updateData: {
      status?: AssetStatus;
      assignedToId?: string | null;
      lastServiceDate?: Date | null;
      brand?: string;
      model?: string | null;
      modelYear?: number | null;
      mileage?: number | null;
      operatingHours?: number | null;
      imageUrl?: string | null;
    } = {};

    if (dto.status) {
      updateData.status = dto.status;
    }

    if (dto.last_service_date !== undefined) {
      updateData.lastServiceDate = dto.last_service_date
        ? new Date(dto.last_service_date)
        : null;
    }

    if (dto.brand !== undefined) {
      updateData.brand = this.resolveBrand(dto.brand).label;
    }

    if (dto.model !== undefined) {
      updateData.model = dto.model?.trim() || null;
    }

    if (dto.modelYear !== undefined) {
      updateData.modelYear = dto.modelYear ?? null;
    }

    if (dto.mileage !== undefined) {
      updateData.mileage = dto.mileage ?? null;
    }

    if (dto.operatingHours !== undefined) {
      updateData.operatingHours = dto.operatingHours ?? null;
    }

    if (dto.image_url !== undefined) {
      updateData.imageUrl = dto.image_url?.trim() || null;
    }

    if (dto.assignedTo !== undefined) {
      if (dto.assignedTo === null || dto.assignedTo.trim() == '') {
        updateData.assignedToId = null;
      } else {
        const staff = await this.prisma.whitelistStaff.findFirst({
          where: { id: dto.assignedTo, userId },
        });
        if (!staff) {
          throw new BadRequestException(
            'Assigned staff not found for current user',
          );
        }
        updateData.assignedToId = staff.id;
      }
    }

    const updated = await (this.prisma as any).asset.update({
      where: { id: assetId },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            imagePath: true,
          },
        },
      },
    });

    return {
      ...this.sanitize(updated),
      diagnosis: await this.buildMechanicalAnalysis(updated),
      aiValidation: aiValidationResult,
    };
  }

  async scanBySerial(
    ownerId: string,
    role: string,
    serialNumber: string,
    assignedFieldId?: string | null,
    staffId?: string | null,
  ) {
    const where: any = {
      userId: ownerId,
      serialNumber: serialNumber.trim(),
    };

    if (role === 'WORKER' || role === 'FARMER') {
      const workerFilters: any[] = [];

      if (assignedFieldId) {
        workerFilters.push({ fieldId: assignedFieldId });
      }

      if (staffId) {
        workerFilters.push({ assignedToId: staffId });
      }

      if (!workerFilters.length) {
        throw new NotFoundException('No field assigned to this worker');
      }
      where.AND = [{ OR: workerFilters }];
    }

    const asset = await (this.prisma as any).asset.findFirst({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, imagePath: true },
        },
        field: {
          select: { id: true, name: true },
        },
        usageLogs: {
          orderBy: { startTime: 'desc' },
          take: 1,
          include: {
            farmer: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const diagnosis = await this.buildMechanicalAnalysis(asset);

    return {
      asset: this.sanitize(asset),
      aiMessage: `${diagnosis.technicalBulletin} Focus on the ${diagnosis.criticalComponent} and inspect it before the next shift.`,
      diagnosis,
    };
  }

  async searchBrands(query: string) {
    const normalized = this.normalize(query);
    if (!normalized) {
      return BRAND_CATALOG.slice(0, 20).map((brand) => ({ brand, score: 1 }));
    }

    return BRAND_CATALOG.map((brand) => ({
      brand,
      score: this.brandScore(normalized, this.normalize(brand)),
    }))
      .filter((item) => item.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }

  async startUsageSession(
    farmerId: string,
    dto: {
      assetId: string;
      startMileage?: number;
      startOperatingHours?: number;
      taskType?: string;
      startTime?: string;
      notes?: string;
    },
  ) {
    return this.startAssetSession(farmerId, dto.assetId);
  }

  async endUsageSession(
    farmerId: string,
    dto: {
      usageLogId: string;
      endMileage?: number;
      endOperatingHours?: number;
      fuelLevel?: number;
      conditionNote?: string;
      endTime?: string;
      returnConfirmation?: boolean;
      issues?: string;
      notes?: string;
    },
  ) {
    const session = await this.usageLogClient().findFirst({
      where: {
        id: dto.usageLogId,
        farmerId,
        endTime: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Active usage session not found');
    }

    const startMileage = session.startMileage ?? 0;
    const computedDistance =
      dto.endMileage != null ? Math.max(0, dto.endMileage - startMileage) : 0;

    return this.endAssetSession(farmerId, session.assetId, {
      distanceKm: computedDistance,
      issues: dto.issues,
      maintenanceNote: dto.notes,
      condition: SessionCondition.GOOD,
    });
  }

  async startAssetSession(workerId: string, assetId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const worker = await (tx as any).whitelistStaff.findFirst({
        where: { id: workerId, role: { in: ['WORKER', 'FARMER'] } },
      });

      if (!worker) {
        throw new BadRequestException('Worker session context not found');
      }

      const assetWhere: any = {
        id: assetId,
        userId: worker.userId,
        OR: [],
      };

      if (worker.assignedFieldId) {
        assetWhere.OR.push({ fieldId: worker.assignedFieldId });
      }

      assetWhere.OR.push({ assignedToId: worker.id });

      const asset = await (tx as any).asset.findFirst({ where: assetWhere });

      if (!asset) {
        throw new NotFoundException('Asset not found for worker field');
      }

      const predictiveCheck = await this.predictiveMaintenanceService.ensureSafeToUse(asset.id);
      if (!predictiveCheck.canUse) {
        throw new ConflictException(
          'Machine is in high-risk condition. Maintenance required before use.',
        );
      }

      if (asset.status !== AssetStatus.AVAILABLE) {
        throw new ConflictException('Asset is not available');
      }

      const activeSession = await (tx as any).usageLog.findFirst({
        where: {
          assetId,
          endTime: null,
        },
      });

      if (activeSession) {
        throw new ConflictException('Asset already has an active usage session');
      }

      const session = await (tx as any).usageLog.create({
        data: {
          assetId,
          farmerId: workerId,
          fieldId: asset.fieldId,
          startTime: new Date(),
          startMileage: asset.mileage ?? 0,
          startOperatingHours: asset.operatingHours ?? null,
          notes: null,
        },
      });

      const updated = await (tx as any).asset.updateMany({
        where: { id: assetId, status: AssetStatus.AVAILABLE },
        data: { status: AssetStatus.IN_USE },
      });

      if (!updated || updated.count !== 1) {
        throw new ConflictException('Asset status changed while starting session');
      }

      return session;
    });

    return {
      success: true,
      session: this.serializeSession(result),
    };
  }

  async endAssetSession(
    workerId: string,
    assetId: string,
    checkout: EndAssetSessionDto,
  ) {
    if (checkout.distanceKm < 0) {
      throw new BadRequestException('distanceKm must be greater than or equal to 0');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const worker = await (tx as any).whitelistStaff.findFirst({
        where: { id: workerId, role: { in: ['WORKER', 'FARMER'] } },
      });

      if (!worker) {
        throw new BadRequestException('Worker session context not found');
      }

      const assetWhere: any = {
        id: assetId,
        userId: worker.userId,
        OR: [],
      };

      if (worker.assignedFieldId) {
        assetWhere.OR.push({ fieldId: worker.assignedFieldId });
      }

      assetWhere.OR.push({ assignedToId: worker.id });

      const asset = await (tx as any).asset.findFirst({ where: assetWhere });

      if (!asset) {
        throw new NotFoundException('Asset not found for worker field');
      }

      const activeSession = await (tx as any).usageLog.findFirst({
        where: {
          assetId,
          endTime: null,
        },
      });

      if (!activeSession) {
        throw new NotFoundException('No active usage session found for this asset');
      }

      const endTime = new Date();
      const durationHours = this.computeDurationHours(activeSession.startTime, endTime);
      const existingMileage = asset.mileage ?? activeSession.startMileage ?? 0;
      const existingOperatingHours =
        asset.operatingHours ?? activeSession.startOperatingHours ?? 0;
      const nextMileage = Number((existingMileage + checkout.distanceKm).toFixed(2));
      const nextOperatingHours = Number((existingOperatingHours + durationHours).toFixed(2));

      const updatedSession = await (tx as any).usageLog.update({
        where: { id: activeSession.id },
        data: {
          endTime,
          duration: durationHours,
          distanceKm: checkout.distanceKm,
          issues: checkout.issues?.trim() || null,
          maintenanceNote: checkout.maintenanceNote?.trim() || null,
          condition: checkout.condition,
          endMileage: nextMileage,
          endOperatingHours: nextOperatingHours,
        },
      });

      const updated = await (tx as any).asset.updateMany({
        where: { id: assetId, status: AssetStatus.IN_USE },
        data: {
          status: AssetStatus.AVAILABLE,
          mileage: nextMileage,
          operatingHours: nextOperatingHours,
        },
      });

      if (!updated || updated.count !== 1) {
        throw new ConflictException('Asset status changed while ending session');
      }

      const updatedAsset = await (tx as any).asset.findFirst({ where: { id: assetId } });

      return { updatedSession, durationHours, updatedAsset };
    });

    void this.assetMaintenanceNotificationService
      .notifyAfterSessionEnd({
        ownerId: result.updatedAsset.userId,
        assetId,
        assetName: result.updatedAsset.name,
        sessionId: result.updatedSession.id,
        operatingHours: result.updatedAsset.operatingHours ?? 0,
        condition: checkout.condition,
        issues: checkout.issues?.trim() || null,
      })
      .catch((error) => {
        this.logger.warn(
          `Maintenance notification dispatch failed for asset ${assetId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });

    return {
      success: true,
      duration: result.durationHours,
      durationHours: result.durationHours,
      updatedAsset: this.sanitize(result.updatedAsset),
      session: this.serializeSession(result.updatedSession),
    };
  }

  async getWeeklyUsageIntensity(farmerId: string) {
    const sessions = await this.usageLogClient().findMany({
      where: { farmerId },
      orderBy: { startTime: 'asc' },
      include: { asset: true },
    });

    const now = new Date();
    const labels = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return date;
    });

    const points = labels.map((date) => {
      const key = date.toISOString().slice(0, 10);
      const daySessions = sessions.filter((session: any) =>
        new Date(session.startTime).toISOString().slice(0, 10) === key,
      );

      const totalHours = daySessions.reduce((sum: number, session: any) => {
        if (!session.endTime) {
          return sum;
        }
        return (
          sum +
          Math.max(
            0,
            (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) /
              36e5,
          )
        );
      }, 0);

      return {
        label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][date.getDay() === 0 ? 6 : date.getDay() - 1],
        totalHours: Number(totalHours.toFixed(2)),
        sessions: daySessions.length,
      };
    });

    return points;
  }

  async getAssetHistory(
    ownerId: string,
    role: string,
    assetId: string,
    assignedFieldId?: string | null,
    staffId?: string | null,
  ) {
    const asset = await this.getAssetWithAccess(
      ownerId,
      role,
      assetId,
      assignedFieldId,
      staffId,
    );

    const sessions = await this.usageLogClient().findMany({
      where: { assetId: asset.id },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    const items = sessions.map((session: any) => {
      const durationHours = this.computeDurationHours(session.startTime, session.endTime);
      return {
        id: session.id,
        farmerId: session.farmerId,
        farmerName: session.farmer?.name ?? 'Unknown Farmer',
        startTime: session.startTime,
        endTime: session.endTime,
        durationHours,
        taskType: session.taskType,
        fuelLevel: session.fuelLevel,
        conditionNote: session.conditionNote,
        notes: session.notes,
      };
    });

    return {
      assetId: asset.id,
      history: items,
      aggregates: this.calculateUsageAggregates(items),
    };
  }

  async getAiDiagnostics(
    ownerId: string,
    role: string,
    assetId: string,
    assignedFieldId?: string | null,
    staffId?: string | null,
  ) {
    try {
      const asset = await this.getAssetWithAccess(
        ownerId,
        role,
        assetId,
        assignedFieldId,
        staffId,
      );

      // Use flexible AI engine
      const diagnosis = await this.buildMechanicalAnalysis(asset);

      const historyResult = await this.getAssetHistory(
        ownerId,
        role,
        assetId,
        assignedFieldId,
        staffId,
      );
      const dynamicReport = this.buildDynamicReport(asset.brand, historyResult.history);

      return {
        assetId: asset.id,
        diagnostics: diagnosis,
        dynamicReport,
        usageAggregates: historyResult.aggregates,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error getting AI diagnostics:', error);
      throw new BadRequestException('Unable to load deep-dive data for this asset');
    }
  }

  private resolveBrand(input: string) {
    const normalized = this.normalize(input);
    const matches = BRAND_CATALOG.map((brand) => ({
      brand,
      score: this.brandScore(normalized, this.normalize(brand)),
    })).sort((a, b) => b.score - a.score);

    const best = matches[0];
    if (!best || best.score < 0.4) {
      return {
        label: input.trim(),
        confidence: 0.2,
        suggestedMatch: null,
      };
    }

    return {
      label: best.brand,
      confidence: Number(best.score.toFixed(2)),
      suggestedMatch: best.brand,
    };
  }

  private async buildMechanicalAnalysis(
    asset: any,
    overrideModel?: string | null,
    issueText?: string,
  ): Promise<MechanicalAnalysis> {
    const payload = {
      brand: asset.brand,
      model: overrideModel ?? asset.model,
      modelYear: asset.modelYear,
      mileage: asset.mileage,
      operatingHours: asset.operatingHours,
      issueText,
    };

    // Try flexible AI engine first
    try {
      const flexibleResult = await this.callFlexibleAIEngine(payload);
      if (flexibleResult) {
        return flexibleResult;
      }
    } catch (error) {
      console.warn('Flexible AI engine error, falling back to local analysis:', error);
    }

    // Fallback to local analysis
    return this.localMechanicalAnalysis(payload);
  }

  private async callFlexibleAIEngine(payload: {
    brand: string;
    model?: string | null;
    modelYear?: number | null;
    mileage?: number | null;
    operatingHours?: number | null;
    issueText?: string;
  }): Promise<MechanicalAnalysis | null> {
    const scriptPath =
      this.configService.get<string>('FLEXIBLE_AI_ENGINE_PATH') ||
      join(process.cwd(), '..', 'face_recognition_ai', 'ai_engine_flexible.py');

    const args = [
      scriptPath,
      '--brand',
      payload.brand || 'Unknown',
      '--model',
      payload.model || '',
      '--mileage',
      String(payload.mileage ?? 0),
      '--operating-hours',
      String(payload.operatingHours ?? 0),
      '--issue',
      payload.issueText || '',
      '--model-year',
      String(payload.modelYear ?? 0),
      '--json',
    ];

    return new Promise((resolve, reject) => {
      const child = spawn('python3', args, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          CLAUDE_API_KEY: this.configService.get('CLAUDE_API_KEY') || '',
          CUSTOM_AI_ENDPOINT: this.configService.get('CUSTOM_AI_ENDPOINT') || '',
          CUSTOM_AI_API_KEY: this.configService.get('CUSTOM_AI_API_KEY') || '',
          MECHANICAL_KB_API_URL: this.configService.get('MECHANICAL_KB_API_URL') || '',
          MECHANICAL_KB_API_KEY: this.configService.get('MECHANICAL_KB_API_KEY') || '',
        },
        timeout: 15000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        console.error('AI engine subprocess error:', error);
        resolve(null); // Fallback to local KB instead of rejecting
      });

      child.on('close', (code) => {
        if (code !== 0) {
          console.error('AI engine returned error:', stderr);
          resolve(null); // Fallback to local analysis
          return;
        }

        try {
          const diagnosis = JSON.parse(stdout.trim());
          const result: MechanicalAnalysis = {
            brand: diagnosis.brand || payload.brand,
            model: diagnosis.model ?? null,
            modelYear: diagnosis.model_year ?? null,
            failureProbability:
              Number(diagnosis.failure_probability ?? diagnosis.risk_percentage ?? 35) / 100,
            riskPercentage:
              Number(diagnosis.risk_percentage ?? diagnosis.failure_probability ?? 35),
            criticalComponent: diagnosis.critical_component || 'General Inspection',
            maintenanceProTip:
              diagnosis.maintenance_pro_tip || 'Regular maintenance recommended',
            technicalBulletin:
              diagnosis.technical_bulletin || 'See service manual for details',
            serviceIntervalKm: diagnosis.service_interval_km ?? null,
            serviceIntervalHours: diagnosis.service_interval_hours ?? null,
            source: 'external-kb',
          };
          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse AI engine output:', parseError);
          resolve(null); // Fallback to local analysis
        }
      });
    });
  }

  private localMechanicalAnalysis(payload: {
    brand: string;
    model?: string | null;
    modelYear?: number | null;
    mileage?: number | null;
    operatingHours?: number | null;
    issueText?: string;
  }): MechanicalAnalysis {
    const brand = this.normalize(payload.brand);
    const model = this.normalize(payload.model || '');
    const issue = this.normalize(payload.issueText || '');
    const miles = payload.mileage ?? 0;
    const hours = payload.operatingHours ?? 0;

    const catalogue = [
      {
        brandHints: ['landini'],
        intervalKm: 1200,
        intervalHours: 250,
        criticalComponent: 'Clutch and Front Axle Assembly',
        maintenanceProTip: 'Inspect clutch free play, axle boots, and steering linkage before the next field shift.',
      },
      {
        brandHints: ['john deere'],
        intervalKm: 1500,
        intervalHours: 300,
        criticalComponent: 'Electronic Sensor Suite',
        maintenanceProTip: 'Inspect ECU connectors, harness seals, and hydraulic pressure feedback before heavy-duty work.',
      },
      {
        brandHints: ['new holland'],
        intervalKm: 1400,
        intervalHours: 280,
        criticalComponent: 'Transmission Cooling Circuit',
        maintenanceProTip: 'Check coolant quality, hydraulic temperature, and fan belt tension before afternoon operations.',
      },
      {
        brandHints: ['massey ferguson'],
        intervalKm: 1300,
        intervalHours: 260,
        criticalComponent: 'Hydraulic Lift System',
        maintenanceProTip: 'Review hydraulic seals and lift drift under load; replace weak O-rings before the next cycle.',
      },
      {
        brandHints: ['kubota'],
        intervalKm: 1100,
        intervalHours: 220,
        criticalComponent: 'Fuel and Air Filtration',
        maintenanceProTip: 'Keep filters clean and inspect air intake dust load after every intensive operation.',
      },
    ];

    const matched = catalogue.find((entry) =>
      entry.brandHints.some((hint) => brand.includes(hint)),
    );

    const serviceIntervalKm = matched?.intervalKm ?? 1000;
    const serviceIntervalHours = matched?.intervalHours ?? 200;
    const mileagePressure = serviceIntervalKm > 0 ? miles / serviceIntervalKm : 0;
    const hoursPressure = serviceIntervalHours > 0 ? hours / serviceIntervalHours : 0;

    const baseRisk = Math.min(45, (mileagePressure * 35) + (hoursPressure * 25));
    let issueBoost = 0;
    if (issue.includes('squeak') || issue.includes('squeak')) issueBoost += 18;
    if (issue.includes('grind') || issue.includes('rattle')) issueBoost += 16;
    if (issue.includes('oil leak') || issue.includes('hydraulic')) issueBoost += 14;
    if (issue.includes('overheat') || issue.includes('heat')) issueBoost += 20;

    const modelKey = model;
    let technicalBulletin = `Brand/model verification completed for ${payload.brand}${payload.model ? ` ${payload.model}` : ''}. Review the service log before the next session.`;

    if (brand.includes('landini') && modelKey.includes('rex 4') && issue.includes('squeak')) {
      technicalBulletin = 'Landini Rex 4 squeaking usually points to belt tension, front axle bushings, or cab mount vibration. Check belt wear, front suspension joints, and grease all pivot points before returning to field work.';
      issueBoost += 18;
    } else if (brand.includes('john deere') && issue.includes('squeak')) {
      technicalBulletin = 'John Deere squeaking under load is often caused by belt glazing or dry bearings. Inspect the drive belt, idler pulley, and wheel hub bearings immediately.';
      issueBoost += 14;
    } else if (issue.includes('squeak')) {
      technicalBulletin = `Squeaking detected on ${payload.brand}${payload.model ? ` ${payload.model}` : ''}. Inspect belts, idler pulleys, chassis bushings, and bearing lubrication before the next operation.`;
      issueBoost += 10;
    }

    const riskPercentage = Math.round(
      Math.max(12, Math.min(97, baseRisk + issueBoost + (payload.modelYear && payload.modelYear < 2018 ? 8 : 0))),
    );

    return {
      brand: payload.brand,
      model: payload.model ?? null,
      modelYear: payload.modelYear ?? null,
      failureProbability: riskPercentage,
      riskPercentage,
      criticalComponent: matched?.criticalComponent ?? 'General Drivetrain',
      maintenanceProTip:
        matched?.maintenanceProTip ?? 'Inspect lubrication, filters, and drivetrain alignment before the next operation.',
      technicalBulletin,
      serviceIntervalKm,
      serviceIntervalHours,
      source: 'local-kb',
    };
  }

  private serializeSession(session: any) {
    return {
      id: session.id,
      assetId: session.assetId,
      farmerId: session.farmerId,
      fieldId: session.fieldId,
      startTime: session.startTime,
      endTime: session.endTime,
      startMileage: session.startMileage,
      startOperatingHours: session.startOperatingHours,
      endMileage: session.endMileage,
      endOperatingHours: session.endOperatingHours,
      taskType: session.taskType,
      duration: session.duration,
      distanceKm: session.distanceKm,
      issues: session.issues,
      maintenanceNote: session.maintenanceNote,
      condition: session.condition,
      fuelLevel: session.fuelLevel,
      conditionNote: session.conditionNote,
      notes: session.notes,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private async getAssetWithAccess(
    ownerId: string,
    role: string,
    assetId: string,
    assignedFieldId?: string | null,
    staffId?: string | null,
  ) {
    const where: any = { id: assetId, userId: ownerId };
    if (role === 'WORKER' || role === 'FARMER') {
      const workerFilters: any[] = [];

      if (assignedFieldId) {
        workerFilters.push({ fieldId: assignedFieldId });
      }

      if (staffId) {
        workerFilters.push({ assignedToId: staffId });
      }

      if (!workerFilters.length) {
        throw new NotFoundException('No field assigned to this worker');
      }

      where.AND = [{ OR: workerFilters }];
    }

    const asset = await (this.prisma as any).asset.findFirst({ where });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  private usageLogClient() {
    const client = (this.prisma as any).usageLog;
    if (!client) {
      throw new BadRequestException(
        'UsageLog delegate is unavailable. Run `npx prisma generate` in PIM_BACKEND and restart the Nest server.',
      );
    }
    return client;
  }

  private computeDurationHours(startTime: Date, endTime?: Date | null) {
    if (!startTime || !endTime) return 0;
    return Number(
      Math.max(0, (new Date(endTime).getTime() - new Date(startTime).getTime()) / 36e5).toFixed(2),
    );
  }

  private calculateUsageAggregates(
    sessions: Array<{ durationHours: number; endTime?: Date | null }>,
  ) {
    const completed = sessions.filter((item) => item.endTime != null);
    const totalLifetimeHours = Number(
      completed.reduce((sum, item) => sum + item.durationHours, 0).toFixed(2),
    );
    const averageSessionLength = completed.length
      ? Number((totalLifetimeHours / completed.length).toFixed(2))
      : 0;

    return {
      totalLifetimeHours,
      averageSessionLength,
      sessionCount: sessions.length,
      completedSessionCount: completed.length,
    };
  }

  private buildDynamicReport(
    brand: string,
    history: Array<{ startTime: Date; durationHours: number; notes?: string | null }>,
  ) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekly = history.filter(
      (entry) => new Date(entry.startTime).getTime() >= weekAgo.getTime(),
    );
    const longSessions = weekly.filter((entry) => entry.durationHours >= 3);
    const hotNotes = weekly.filter((entry) =>
      this.normalize(entry.notes || '').includes('high temp') ||
      this.normalize(entry.notes || '').includes('overheat') ||
      this.normalize(entry.notes || '').includes('heat'),
    );

    if (longSessions.length >= 3 && hotNotes.length > 0) {
      return `Warning: This ${brand} has had ${longSessions.length} long sessions this week with high-temperature notes. Schedule cooling system check immediately.`;
    }

    if (longSessions.length >= 3) {
      return `Alert: This ${brand} has logged ${longSessions.length} long sessions this week. Run a preventive mechanical check before the next shift.`;
    }

    return `AI Insight: ${brand} session profile is currently stable. Continue preventive checks based on service interval and recent notes.`;
  }

  private normalize(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private brandScore(a: string, b: string) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.includes(b) || b.includes(a)) return 0.92;

    const distance = this.levenshtein(a, b);
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 0 : Math.max(0, 1 - distance / maxLength);
  }

  private levenshtein(a: string, b: string) {
    const matrix = Array.from({ length: a.length + 1 }, () =>
      new Array(b.length + 1).fill(0),
    );

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
    }

    return matrix[a.length][b.length];
  }

  private sanitize(asset: any) {
    const latestUsageLog = Array.isArray(asset.usageLogs) ? asset.usageLogs[0] : null;
    const activeUsageSession = latestUsageLog && latestUsageLog.endTime == null ? latestUsageLog : null;
    const usageCondition = latestUsageLog?.condition ?? null;

    return {
      id: asset.id,
      name: asset.name,
      brand: asset.brand,
      model: asset.model,
      modelYear: asset.modelYear,
      mileage: asset.mileage,
      operatingHours: asset.operatingHours,
      category: asset.category,
      status: asset.status,
      image_url: asset.imageUrl,
      serial_number: asset.serialNumber,
      last_service_date: asset.lastServiceDate,
      assignedTo: asset.assignedTo,
      field_id: asset.fieldId,
      field: asset.field,
      usageCondition,
      isWarning: usageCondition === 'WARNING' || usageCondition === 'CRITICAL',
      activeSession: activeUsageSession
        ? {
            id: activeUsageSession.id,
            assetId: activeUsageSession.assetId,
            farmerId: activeUsageSession.farmerId,
            farmerName: activeUsageSession.farmer?.name ?? null,
            startTime: activeUsageSession.startTime,
            condition: activeUsageSession.condition,
          }
        : null,
      activeUsageWorkerId: activeUsageSession?.farmerId ?? null,
      activeUsageWorkerName: activeUsageSession?.farmer?.name ?? null,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
