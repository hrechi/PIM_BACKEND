import { Module } from '@nestjs/common';
import { RegionalVaccineService } from './regional.service';

@Module({
    providers: [RegionalVaccineService],
    exports: [RegionalVaccineService],
})
export class VaccineRegionalModule { }
