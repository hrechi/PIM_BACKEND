import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MedicalEventsService } from './medical-events.service';
import { CreateMedicalEventDto } from './dto/create-medical-event.dto';

@Controller('animals/:animalId/medical-events')
@UseGuards(JwtAuthGuard)
export class MedicalEventsController {
  constructor(private readonly service: MedicalEventsService) {}

  @Post()
  create(
    @Param('animalId') animalId: string,
    @Body() dto: CreateMedicalEventDto,
    @Req() req: any,
  ) {
    return this.service.create(animalId, req.user.id, dto);
  }

  @Get()
  findAll(
    @Param('animalId') animalId: string,
    @Query('type') type: string | undefined,
    @Req() req: any,
  ) {
    return this.service.findAll(animalId, req.user.id, type);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('animalId') animalId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateMedicalEventDto>,
    @Req() req: any,
  ) {
    return this.service.update(id, req.user.id, dto);
  }
}
