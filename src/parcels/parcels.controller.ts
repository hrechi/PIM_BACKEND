import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { CreateParcelDto } from './dto/create-parcel.dto';
import { UpdateParcelDto } from './dto/update-parcel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCropDto, CreateFertilizationDto, CreateHarvestDto, CreatePestDiseaseDto } from './dto/nested.dto';

@UseGuards(JwtAuthGuard)
@Controller('parcels')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) { }

  @Post()
  create(@Req() req, @Body() createParcelDto: CreateParcelDto) {
    return this.parcelsService.create(req.user.id, createParcelDto);
  }

  @Get()
  async findAll(@Req() req) {
    const data = await this.parcelsService.findAll(req.user.id);
    return { data };
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    const data = await this.parcelsService.findOne(id, req.user.id);
    return { data };
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateParcelDto: UpdateParcelDto) {
    return this.parcelsService.update(id, req.user.id, updateParcelDto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.parcelsService.remove(id, req.user.id);
  }

  @Post(':id/crops')
  addCrop(@Req() req, @Param('id') id: string, @Body() dto: CreateCropDto) {
    return this.parcelsService.addCrop(id, req.user.id, dto);
  }

  @Post(':id/fertilizations')
  addFertilization(@Req() req, @Param('id') id: string, @Body() dto: CreateFertilizationDto) {
    return this.parcelsService.addFertilization(id, req.user.id, dto);
  }

  @Post(':id/pests')
  addPest(@Req() req, @Param('id') id: string, @Body() dto: CreatePestDiseaseDto) {
    return this.parcelsService.addPest(id, req.user.id, dto);
  }

  @Post(':id/harvests')
  addHarvest(@Req() req, @Param('id') id: string, @Body() dto: CreateHarvestDto) {
    return this.parcelsService.addHarvest(id, req.user.id, dto);
  }

  @Get(':id/ai-advice')
  getAiAdvice(@Req() req, @Param('id') id: string) {
    return this.parcelsService.getAiAdvice(id, req.user.id);
  }
}
