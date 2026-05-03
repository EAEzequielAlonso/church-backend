import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyResource } from '../entities/study-resource.entity';

@Injectable()
export class GetResourceUseCase {
  constructor(
    @InjectRepository(StudyResource)
    private resourceRepo: Repository<StudyResource>,
  ) {}

  async execute(churchId: string, id: string): Promise<StudyResource> {
    const resource = await this.resourceRepo.findOne({
      where: { id, churchId },
      relations: ['libraryBook'],
    });
    if (!resource) throw new NotFoundException('Recurso no encontrado');
    return resource;
  }
}
