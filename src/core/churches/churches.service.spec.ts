import { Test, TestingModule } from '@nestjs/testing';
import { ChurchesService } from './churches.service';

describe('ChurchesService', () => {
  let service: ChurchesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChurchesService],
    }).compile();

    service = module.get<ChurchesService>(ChurchesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
