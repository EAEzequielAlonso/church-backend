import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { StudyTopic } from '../entities/study-topic.entity';
import { StudyResource } from '../entities/study-resource.entity';
import { UpdateTopicDto } from '../dto/create-topic.dto';

@Injectable()
export class UpdateTopicUseCase {
  constructor(
    @InjectRepository(StudyTopic)
    private topicRepo: Repository<StudyTopic>,
    @InjectRepository(StudyResource)
    private resourceRepo: Repository<StudyResource>,
  ) {}

  async execute(churchId: string, id: string, dto: UpdateTopicDto): Promise<StudyTopic> {
    const topic = await this.topicRepo.findOne({ where: { id, churchId } });
    if (!topic) throw new NotFoundException('Tema no encontrado');

    if (dto.title !== undefined) topic.title = dto.title;
    if (dto.description !== undefined) topic.description = dto.description;
    if (dto.order !== undefined) topic.order = dto.order;

    if (dto.resourceIds !== undefined) {
      if (dto.resourceIds.length > 0) {
        const count = await this.resourceRepo.count({
          where: { id: In(dto.resourceIds), churchId },
        });
        if (count !== dto.resourceIds.length) {
          throw new BadRequestException('Uno o más recursos no existen o no pertenecen a esta iglesia.');
        }
        topic.resources = dto.resourceIds.map(resId => ({ id: resId } as StudyResource));
      } else {
        topic.resources = [];
      }
    }

    return this.topicRepo.save(topic);
  }
}
