import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyCollection } from '../entities/study-collection.entity';

@Injectable()
export class DeleteCollectionUseCase {
  constructor(
    @InjectRepository(StudyCollection)
    private collectionRepo: Repository<StudyCollection>,
  ) {}

  async execute(churchId: string, id: string): Promise<void> {
    const collection = await this.collectionRepo.findOne({ where: { id, churchId } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    await this.collectionRepo.remove(collection);
  }
}
