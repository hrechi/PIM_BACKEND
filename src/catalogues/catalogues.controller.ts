import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CataloguesService } from './catalogues.service';
import {
  AddCatalogueAnimalsDto,
  CreateSaleCatalogueDto,
  PreviewCatalogueFilterDto,
  UpdateCatalogueAnimalDto,
  UpdateSaleCatalogueDto,
} from './dto/catalogue.dto';

@ApiTags('Catalogues')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('catalogues')
export class CataloguesController {
  constructor(private readonly cataloguesService: CataloguesService) {}

  @Post()
  async createCatalogue(@Req() req: any, @Body() dto: CreateSaleCatalogueDto) {
    return this.cataloguesService.createCatalogue(req.user.id, dto);
  }

  @Get()
  async listCatalogues(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.cataloguesService.listCatalogues(req.user.id, {
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post('preview-filter')
  async previewFilter(@Req() req: any, @Body() dto: PreviewCatalogueFilterDto) {
    return this.cataloguesService.previewFilter(req.user.id, dto);
  }

  @Get(':id/pdf')
  async getCataloguePdf(@Req() req: any, @Param('id') id: string) {
    return this.cataloguesService.getCataloguePdf(req.user.id, id);
  }

  @Get(':id')
  async getCatalogue(@Req() req: any, @Param('id') id: string) {
    const catalogue = await this.cataloguesService.getCatalogueById(
      id,
      req.user.id,
    );
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found');
    }
    return catalogue;
  }

  @Patch(':id')
  async updateCatalogue(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSaleCatalogueDto,
  ) {
    return this.cataloguesService.updateCatalogue(req.user.id, id, dto);
  }

  @Delete(':id')
  async deleteCatalogue(@Req() req: any, @Param('id') id: string) {
    return this.cataloguesService.deleteCatalogue(req.user.id, id);
  }

  @Post(':id/animals')
  async addAnimals(
    @Req() req: any,
    @Param('id') catalogueId: string,
    @Body() dto: AddCatalogueAnimalsDto,
  ) {
    return this.cataloguesService.addAnimals(req.user.id, catalogueId, dto);
  }

  @Delete(':id/animals/:animalId')
  async removeAnimal(
    @Req() req: any,
    @Param('id') catalogueId: string,
    @Param('animalId') animalId: string,
  ) {
    return this.cataloguesService.removeAnimal(
      req.user.id,
      catalogueId,
      animalId,
    );
  }

  @Patch(':id/animals/:animalId')
  async updateAnimal(
    @Req() req: any,
    @Param('id') catalogueId: string,
    @Param('animalId') animalId: string,
    @Body() dto: UpdateCatalogueAnimalDto,
  ) {
    return this.cataloguesService.updateCatalogueAnimal(
      req.user.id,
      catalogueId,
      animalId,
      dto,
    );
  }

  @Post(':id/share')
  async shareCatalogue(@Req() req: any, @Param('id') id: string) {
    return this.cataloguesService.generateShareLink(req.user.id, id);
  }

  @Delete(':id/share')
  async revokeShare(@Req() req: any, @Param('id') id: string) {
    return this.cataloguesService.revokeShareLink(req.user.id, id);
  }
}
