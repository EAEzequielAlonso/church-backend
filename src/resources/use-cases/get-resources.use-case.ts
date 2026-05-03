import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyResource } from '../entities/study-resource.entity';

@Injectable()
export class GetResourcesUseCase {
  constructor(
    @InjectRepository(StudyResource)
    private resourceRepo: Repository<StudyResource>,
  ) {}

  async execute(churchId: string): Promise<StudyResource[]> {
    return this.resourceRepo.find({
      where: { churchId },
      order: { createdAt: 'DESC' },
      relations: ['libraryBook'],
    });
  }
}
