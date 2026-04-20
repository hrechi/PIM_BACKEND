import {
  BadRequestException,
  Body,
  Controller,
  FileValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetService } from './asset.service';

class ImageFileValidator extends FileValidator {
  private allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

  isValid(file: Express.Multer.File): boolean {
    const ext = extname(file.originalname).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  buildErrorMessage(): string {
    return 'Only image files (jpg, jpeg, png, webp) are allowed';
  }
}

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

  @Post('upload')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Upload an asset image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        xporimage: {
          type: 'string',
          format: 'binary',
          description: 'Asset photo (jpg, jpeg, png, webp — max 5 MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Asset image uploaded' })
  @ApiResponse({ status: 422, description: 'Invalid file type or size' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const targetDir = join(process.cwd(), 'uploads', 'assets');
          if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
          }
          cb(null, targetDir);
        },
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `asset-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadAssetImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new ImageFileValidator({}),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const imagePath = `/uploads/assets/${file.filename}`;
    return { imagePath, image_url: imagePath };
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
