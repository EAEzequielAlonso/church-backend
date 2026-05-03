import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyCollection } from '../entities/study-collection.entity';

@Injectable()
export class GetCollectionUseCase {
  constructor(
    @InjectRepository(StudyCollection)
    private collectionRepo: Repository<StudyCollection>,
  ) {}

  async execute(churchId: string, id: string): Promise<StudyCollection> {
    const collection = await this.collectionRepo.findOne({
      where: { id, churchId },
      relations: ['topics', 'topics.resources', 'topics.resources.libraryBook'],
    });
    
    if (!collection) throw new NotFoundException('Colección no encontrada');
    
    if (collection.topics) {
      collection.topics.sort((a, b) => a.order - b.order);
    }
    
    return collection;
  }
}
