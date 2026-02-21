import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
} from '@nestjs/common';
import { AnimalsService } from './animals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('animals')
@UseGuards(JwtAuthGuard)
export class AnimalsController {
    constructor(private readonly animalsService: AnimalsService) { }

    @Post()
    create(@Body() data: any, @Req() req: any) {
        return this.animalsService.create(data, req.user.id);
    }

    @Get()
    findAll(@Req() req: any) {
        return this.animalsService.findAllByFarmer(req.user.id);
    }

    @Get('stats')
    getStats(@Req() req: any) {
        return this.animalsService.getStatistics(req.user.id);
    }

    @Put(':nodeId')
    update(@Param('nodeId') nodeId: string, @Body() data: any, @Req() req: any) {
        return this.animalsService.update(nodeId, data, req.user.id);
    }

    @Delete(':nodeId')
    remove(@Param('nodeId') nodeId: string, @Req() req: any) {
        return this.animalsService.remove(nodeId, req.user.id);
    }
}

