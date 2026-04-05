import { Test, TestingModule } from '@nestjs/testing';
import { HarvestOptimizationService } from './harvest-optimization.service';

describe('HarvestOptimizationService', () => {
  let service: HarvestOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HarvestOptimizationService],
    }).compile();

    service = module.get<HarvestOptimizationService>(HarvestOptimizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
