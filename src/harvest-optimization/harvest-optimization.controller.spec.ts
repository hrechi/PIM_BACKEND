import { Test, TestingModule } from '@nestjs/testing';
import { HarvestOptimizationController } from './harvest-optimization.controller';

describe('HarvestOptimizationController', () => {
  let controller: HarvestOptimizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HarvestOptimizationController],
    }).compile();

    controller = module.get<HarvestOptimizationController>(HarvestOptimizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
