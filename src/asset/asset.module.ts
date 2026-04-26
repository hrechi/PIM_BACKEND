import { Module, forwardRef } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';
import { AssetInsightsService } from './asset-insights.service';
import { AssetMaintenanceNotificationService } from './asset-maintenance-notification.service';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';

@Module({
  imports: [forwardRef(() => AiModule), NotificationModule],
  controllers: [AssetController],
  providers: [
    AssetService,
    RolesGuard,
    AssetMaintenanceNotificationService,
    AssetInsightsService,
    PredictiveMaintenanceService,
  ],
  exports: [AssetService, AssetInsightsService, PredictiveMaintenanceService],
})
export class AssetModule {}
