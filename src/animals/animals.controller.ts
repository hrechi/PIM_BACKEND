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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('animals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnimalsController {
    constructor(private readonly animalsService: AnimalsService) { }

    @Post()
    @Roles('OWNER')
    create(@Body() data: any, @Req() req: any) {
        return this.animalsService.create(data, req.user.id);
    }

    @Get()
    @Roles('OWNER', 'FARMER')
    findAll(@Req() req: any, @Query('animalType') animalType?: string, @Query('fieldId') fieldId?: string) {
        return this.animalsService.findAllByFarmer(
            req.user.id,
            animalType,
            fieldId,
            req.user.role,
            req.user.assignedFieldId,
        );
    }

    @Get('stats')
    @Roles('OWNER', 'FARMER')
    getStats(@Req() req: any, @Query('fieldId') fieldId?: string) {
        return this.animalsService.getStatistics(
            req.user.id,
            fieldId,
            req.user.role,
            req.user.assignedFieldId,
        );
    }

    @Patch(':nodeId')
    @Roles('OWNER')
    update(@Param('nodeId') nodeId: string, @Body() data: any, @Req() req: any) {
        return this.animalsService.update(nodeId, data, req.user.id);
    }

    @Delete(':nodeId')
    @Roles('OWNER')
    remove(@Param('nodeId') nodeId: string, @Req() req: any) {
        return this.animalsService.remove(nodeId, req.user.id);
    }
}

