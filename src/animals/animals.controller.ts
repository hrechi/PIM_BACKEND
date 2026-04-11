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
    Query,
} from '@nestjs/common';
import { AnimalsService } from './animals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SellAnimalDto } from './animals.dto';

@Controller('animals')
@UseGuards(JwtAuthGuard)
export class AnimalsController {
    constructor(private readonly animalsService: AnimalsService) { }

    @Post()
    create(@Body() data: any, @Req() req: any) {
        return this.animalsService.create(data, req.user.id);
    }

    @Get()
    findAll(@Req() req: any, @Query('animalType') animalType?: string, @Query('fieldId') fieldId?: string) {
        return this.animalsService.findAllByFarmer(req.user.id, animalType, fieldId);
    }

    @Get('sold')
    getSoldAnimals(@Req() req: any, @Query('fieldId') fieldId?: string) {
        return this.animalsService.getSoldAnimals(req.user.id, fieldId);
    }

    @Get('id/:id')
    findById(@Req() req: any, @Param('id') id: string) {
        return this.animalsService.findById(id, req.user.id);
    }

    @Get('stats')
    getStats(@Req() req: any, @Query('fieldId') fieldId?: string) {
        return this.animalsService.getStatistics(req.user.id, fieldId);
    }

    @Patch(':nodeId')
    update(@Param('nodeId') nodeId: string, @Body() data: any, @Req() req: any) {
        return this.animalsService.update(nodeId, data, req.user.id);
    }

    @Patch(':nodeId/sell')
    sell(@Param('nodeId') nodeId: string, @Body() data: SellAnimalDto, @Req() req: any) {
        return this.animalsService.sell(nodeId, data, req.user.id);
    }

    @Delete(':nodeId')
    remove(@Param('nodeId') nodeId: string, @Req() req: any) {
        return this.animalsService.remove(nodeId, req.user.id);
    }
}

