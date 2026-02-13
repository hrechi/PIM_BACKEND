import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
} from '@nestjs/common';
import { AnimalsService } from './animals.service';

@Controller('animals')
export class AnimalsController {
    constructor(private readonly animalsService: AnimalsService) { }

    @Post()
    create(@Body() data: any) {
        return this.animalsService.create(data);
    }

    @Get(':farmerId')
    findAll(@Param('farmerId') farmerId: string) {
        return this.animalsService.findAllByFarmer(farmerId);
    }

    @Get('stats/:farmerId')
    getStats(@Param('farmerId') farmerId: string) {
        return this.animalsService.getStatistics(farmerId);
    }

    @Put(':nodeId')
    update(@Param('nodeId') nodeId: string, @Body() data: any) {
        return this.animalsService.update(nodeId, data);
    }

    @Delete(':nodeId')
    remove(@Param('nodeId') nodeId: string) {
        return this.animalsService.remove(nodeId);
    }
}

