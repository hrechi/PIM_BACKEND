import { Controller, Get, Param } from '@nestjs/common';
import { AgronomistService } from './agronomist.service';

@Controller('agronomist')
export class AgronomistController {
  constructor(private readonly agronomistService: AgronomistService) {}

  @Get('advice/:parcelId')
  async getAdvice(@Param('parcelId') parcelId: string) {
    const advice = await this.agronomistService.getAdvice(parcelId);
    return { advice };
  }
}