import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CropRotationService } from './crop-rotation.service';
import { RotationAnalysisDto } from './dto/rotation-analysis.dto';

@ApiTags('crop-rotation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('parcels/:parcelId/crop-rotation')
export class CropRotationController {
  constructor(private readonly cropRotationService: CropRotationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get smart crop rotation recommendations for a specific parcel',
  })
  @ApiResponse({ status: 200, type: RotationAnalysisDto })
  async getCropRotationPlan(
    @Param('parcelId') parcelId: string,
  ): Promise<RotationAnalysisDto> {
    return this.cropRotationService.getCropRotationPlan(parcelId);
  }
}
