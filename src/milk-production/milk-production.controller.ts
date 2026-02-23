import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
    Query,
    Delete,
    Patch,
} from '@nestjs/common';
import { MilkProductionService } from './milk-production.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('milk-production')
@UseGuards(JwtAuthGuard)
export class MilkProductionController {
    constructor(private readonly milkProductionService: MilkProductionService) { }

    @Post()
    create(@Body() data: any, @Req() req: any) {
        return this.milkProductionService.create(data, req.user.id);
    }

    @Get()
    findAll(@Req() req: any, @Query('animalId') animalId?: string) {
        return this.milkProductionService.findAllByFarmer(req.user.id, animalId);
    }

    @Get('analytics')
    getAnalytics(
        @Req() req: any,
        @Query('timeframe') timeframe?: string,
        @Query('year') year?: string,
        @Query('month') month?: string,
    ) {
        return this.milkProductionService.getAnalytics(
            req.user.id,
            timeframe,
            year ? parseInt(year) : undefined,
            month ? parseInt(month) : undefined
        );
    }

    @Get('stats')
    getStats(@Req() req: any) {
        return this.milkProductionService.getAnalytics(req.user.id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
        return this.milkProductionService.update(id, data, req.user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Req() req: any) {
        return this.milkProductionService.remove(id, req.user.id);
    }
}
