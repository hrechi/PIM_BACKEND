import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MissionService } from './mission.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Mission')
@Controller('mission')
export class MissionController {
  constructor(private missionService: MissionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new mission' })
  @ApiResponse({ status: 201, description: 'Mission created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or field not found' })
  async createMission(@Req() req: any, @Body() dto: CreateMissionDto) {
    return this.missionService.createMission(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all missions for the current user' })
  @ApiResponse({ status: 200, description: 'List of missions' })
  async getMissions(@Req() req: any, @Query('fieldId') fieldId?: string) {
    return this.missionService.getMissionsByUser(req.user.id, fieldId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a specific mission by ID' })
  @ApiResponse({ status: 200, description: 'Mission data' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async getMission(@Req() req: any, @Param('id') id: string) {
    return this.missionService.getMissionById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a mission' })
  @ApiResponse({ status: 200, description: 'Mission updated successfully' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async updateMission(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missionService.updateMission(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update mission status' })
  @ApiResponse({ status: 200, description: 'Mission status updated' })
  async updateMissionStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.missionService.updateMissionStatus(id, req.user.id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/progress')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update mission progress' })
  @ApiResponse({ status: 200, description: 'Mission progress updated' })
  async updateMissionProgress(
    @Req() req: any,
    @Param('id') id: string,
    @Body('progress') progress: number,
  ) {
    return this.missionService.updateMissionProgress(id, req.user.id, progress);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a mission' })
  @ApiResponse({ status: 200, description: 'Mission deleted successfully' })
  @ApiResponse({ status: 404, description: 'Mission not found' })
  async deleteMission(@Req() req: any, @Param('id') id: string) {
    return this.missionService.deleteMission(id, req.user.id);
  }
}
