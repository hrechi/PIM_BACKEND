import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FieldService } from './field.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Field')
@Controller('field')
export class FieldController {
  constructor(private fieldService: FieldService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new field' })
  @ApiResponse({ status: 201, description: 'Field created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createField(@Req() req: any, @Body() dto: CreateFieldDto) {
    return this.fieldService.createField(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all fields for the current user' })
  @ApiResponse({ status: 200, description: 'List of fields' })
  async getFields(@Req() req: any) {
    return this.fieldService.getFieldsByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a specific field by ID' })
  @ApiResponse({ status: 200, description: 'Field data with missions' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async getField(@Req() req: any, @Param('id') id: string) {
    return this.fieldService.getFieldById(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a field' })
  @ApiResponse({ status: 200, description: 'Field updated successfully' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async updateField(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.fieldService.updateField(id, req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a field' })
  @ApiResponse({ status: 200, description: 'Field deleted successfully' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async deleteField(@Req() req: any, @Param('id') id: string) {
    return this.fieldService.deleteField(id, req.user.id);
  }
}
