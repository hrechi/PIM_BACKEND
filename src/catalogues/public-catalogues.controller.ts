import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CataloguesService } from './catalogues.service';

@ApiTags('Public Catalogues')
@Controller('public/catalogues')
export class PublicCataloguesController {
  constructor(private readonly cataloguesService: CataloguesService) {}

  @Get(':shareToken')
  async getPublicCatalogue(@Param('shareToken') shareToken: string) {
    const catalogue = await this.cataloguesService.getPublicCatalogueByToken(
      shareToken,
    );
    if (!catalogue) {
      throw new NotFoundException('Catalogue not found or expired');
    }
    return catalogue;
  }
}
