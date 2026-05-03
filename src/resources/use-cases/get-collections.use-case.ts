import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyCollection } from '../entities/study-collection.entity';

@Injectable()
export class GetCollectionsUseCase {
  constructor(
    @InjectRepository(StudyCollection)
    private collectionRepo: Repository<StudyCollection>,
  ) {}

  async execute(churchId: string): Promise<any[]> {
    const collections = await this.collectionRepo.find({
      where: { churchId },
      order: { order: 'ASC' },
      relations: ['topics'],
    });

    return collections.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      order: c.order,
      topicCount: c.topics?.length || 0,
    }));
  }
}
