import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StudyCollection } from '../entities/study-collection.entity';
import { StudyTopic } from '../entities/study-topic.entity';
import { UpdateCollectionDto } from '../dto/create-collection.dto';

@Injectable()
export class UpdateCollectionUseCase {
  constructor(
    @InjectRepository(StudyCollection)
    private collectionRepo: Repository<StudyCollection>,
    @InjectRepository(StudyTopic)
    private topicRepo: Repository<StudyTopic>,
  ) {}

  async execute(churchId: string, id: string, dto: UpdateCollectionDto): Promise<StudyCollection> {
    const collection = await this.collectionRepo.findOne({ where: { id, churchId } });
    if (!collection) throw new NotFoundException('Colección no encontrada');

    if (dto.title !== undefined) collection.title = dto.title;
    if (dto.description !== undefined) collection.description = dto.description;
    if (dto.order !== undefined) collection.order = dto.order;

    if (dto.topicIds !== undefined) {
      if (dto.topicIds.length > 0) {
        const count = await this.topicRepo.count({
          where: { id: In(dto.topicIds), churchId },
        });
        if (count !== dto.topicIds.length) {
          throw new BadRequestException('Uno o más temas no existen o no pertenecen a esta iglesia.');
        }
        collection.topics = dto.topicIds.map(tId => ({ id: tId } as StudyTopic));
      } else {
        collection.topics = [];
      }
    }

    return this.collectionRepo.save(collection);
  }
}
