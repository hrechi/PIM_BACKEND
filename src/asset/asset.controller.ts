import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AssetService } from './asset.service';

@ApiTags('Assets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiResponse({ status: 201, description: 'Asset created' })
  @ApiResponse({ status: 409, description: 'Serial number already exists' })
  async create(@Req() req: any, @Body() dto: CreateAssetDto) {
    return this.assetService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets for current user' })
  @ApiResponse({ status: 200, description: 'Assets list' })
  async findAll(@Req() req: any) {
    return this.assetService.findAll(req.user.id);
  }

  @Patch(':id')
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
}
