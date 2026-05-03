import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StudyCollection } from '../entities/study-collection.entity';
import { StudyTopic } from '../entities/study-topic.entity';
import { CreateCollectionDto } from '../dto/create-collection.dto';

@Injectable()
export class CreateCollectionUseCase {
  constructor(
    @InjectRepository(StudyCollection)
    private collectionRepo: Repository<StudyCollection>,
    @InjectRepository(StudyTopic)
    private topicRepo: Repository<StudyTopic>,
  ) {}

  async execute(churchId: string, dto: CreateCollectionDto): Promise<StudyCollection> {
    let order = dto.order;
    if (order === undefined) {
      const qb = this.collectionRepo.createQueryBuilder('collection')
        .select('MAX(collection.order)', 'max')
        .where('collection.churchId = :churchId', { churchId });
      const result = await qb.getRawOne();
      const maxOrder = result?.max !== null ? Number(result.max) : 0;
      order = maxOrder + 1;
    }

    const collection = this.collectionRepo.create({
      title: dto.title,
      description: dto.description,
      order,
      churchId,
    });

    if (dto.topicIds && dto.topicIds.length > 0) {
      const count = await this.topicRepo.count({
        where: { id: In(dto.topicIds), churchId },
      });
      if (count !== dto.topicIds.length) {
        throw new BadRequestException('Uno o más temas no existen o no pertenecen a esta iglesia.');
      }
      collection.topics = dto.topicIds.map(id => ({ id } as StudyTopic));
    } else {
      collection.topics = [];
    }

    return this.collectionRepo.save(collection);
  }
}
