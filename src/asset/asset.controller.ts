import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetService } from './asset.service';

@ApiTags('Assets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('brands/search')
  @Roles('OWNER', 'WORKER', 'FARMER')
  @ApiOperation({ summary: 'Search and validate machine brands' })
  async searchBrands(@Query('query') query = '') {
    return this.assetService.searchBrands(query);
  }

  @Post()
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  @ApiResponse({ status: 409, description: 'Serial number already exists' })
  async create(@Req() req: any, @Body() dto: CreateAssetDto) {
    return this.assetService.create(req.user.id, dto);
  }

  @Get()
  @Roles('OWNER', 'WORKER', 'FARMER')
  @ApiOperation({ summary: 'Get all assets for current user' })
  @ApiResponse({ status: 200, description: 'Assets list' })
  async findAll(@Req() req: any) {
    return this.assetService.findAll(
      req.user.id,
      req.user.role,
      req.user.assignedFieldId,
    );
  }

  @Get('scan/:serialNumber')
  @Roles('OWNER', 'WORKER', 'FARMER')
  @ApiOperation({ summary: 'Scan by serial and return AI mechanical hint' })
  @ApiResponse({ status: 200, description: 'Asset scan and diagnosis result' })
  async scanBySerial(@Req() req: any, @Param('serialNumber') serialNumber: string) {
    return this.assetService.scanBySerial(
      req.user.id,
      req.user.role,
      serialNumber,
      req.user.assignedFieldId,
    );
  }

  @Get(':id/history')
  @Roles('OWNER', 'WORKER', 'FARMER')
  @ApiOperation({ summary: 'Get asset usage history with aggregates' })
  async history(@Req() req: any, @Param('id') id: string) {
    return this.assetService.getAssetHistory(
      req.user.id,
      req.user.role,
      id,
      req.user.assignedFieldId,
    );
  }

  @Get(':id/diagnostics')
  @Roles('OWNER', 'WORKER', 'FARMER')
  @ApiOperation({ summary: 'Run live AI diagnostics for an asset' })
  async diagnostics(@Req() req: any, @Param('id') id: string) {
    return this.assetService.getAiDiagnostics(
      req.user.id,
      req.user.role,
      id,
      req.user.assignedFieldId,
    );
  }

  @Patch(':id')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update asset status/assignee' })
  @ApiResponse({ status: 200, description: 'Asset updated' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetService.update(req.user.id, id, dto);
  }

  @Post('session/start')
  @Roles('WORKER', 'FARMER')
  @ApiOperation({ summary: 'Start a usage session for a farm asset' })
  async startSession(@Req() req: any, @Body() body: any) {
    return this.assetService.startUsageSession(req.user.staffId || req.user.workerId || req.user.id, body);
  }

  @Post('session/end')
  @Roles('WORKER', 'FARMER')
  @ApiOperation({ summary: 'End a usage session and update mileage' })
  async endSession(@Req() req: any, @Body() body: any) {
    return this.assetService.endUsageSession(req.user.staffId || req.user.workerId || req.user.id, body);
  }

  @Get('session/weekly')
  @Roles('WORKER', 'FARMER')
  @ApiOperation({ summary: 'Get weekly usage intensity for the farmer' })
  async weeklyUsage(@Req() req: any) {
    return this.assetService.getWeeklyUsageIntensity(req.user.staffId || req.user.workerId || req.user.id);
  }
}
