import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StudyTopic } from '../entities/study-topic.entity';
import { StudyResource } from '../entities/study-resource.entity';
import { CreateTopicDto } from '../dto/create-topic.dto';

@Injectable()
export class CreateTopicUseCase {
  constructor(
    @InjectRepository(StudyTopic)
    private topicRepo: Repository<StudyTopic>,
    @InjectRepository(StudyResource)
    private resourceRepo: Repository<StudyResource>,
  ) {}

  async execute(churchId: string, dto: CreateTopicDto): Promise<StudyTopic> {
    let order = dto.order;
    if (order === undefined) {
      const qb = this.topicRepo.createQueryBuilder('topic')
        .select('MAX(topic.order)', 'max')
        .where('topic.churchId = :churchId', { churchId });
      const result = await qb.getRawOne();
      const maxOrder = result?.max !== null ? Number(result.max) : 0;
      order = maxOrder + 1;
    }

    const topic = this.topicRepo.create({
      title: dto.title,
      description: dto.description,
      order,
      churchId,
    });

    if (dto.resourceIds && dto.resourceIds.length > 0) {
      const count = await this.resourceRepo.count({
        where: { id: In(dto.resourceIds), churchId },
      });
      if (count !== dto.resourceIds.length) {
        throw new BadRequestException('Uno o más recursos no existen o no pertenecen a esta iglesia.');
      }
      topic.resources = dto.resourceIds.map(id => ({ id } as StudyResource));
    } else {
      topic.resources = [];
    }

    return this.topicRepo.save(topic);
  }
}
