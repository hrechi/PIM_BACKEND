import { Module, forwardRef } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [forwardRef(() => AiModule)],
  controllers: [AssetController],
  providers: [AssetService, RolesGuard],
  exports: [AssetService],
})
export class AssetModule {}
