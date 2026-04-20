import { Module } from '@nestjs/common';
import { CataloguesController } from './catalogues.controller';
import { PublicCataloguesController } from './public-catalogues.controller';
import { CataloguesService } from './catalogues.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CataloguesController, PublicCataloguesController],
  providers: [CataloguesService],
  exports: [CataloguesService],
})
export class CataloguesModule {}
