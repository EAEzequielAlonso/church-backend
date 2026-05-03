import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyTopic } from '../entities/study-topic.entity';

@Injectable()
export class GetTopicUseCase {
  constructor(
    @InjectRepository(StudyTopic)
    private topicRepo: Repository<StudyTopic>,
  ) {}

  async execute(churchId: string, id: string): Promise<StudyTopic> {
    const topic = await this.topicRepo.findOne({
      where: { id, churchId },
      relations: ['resources', 'resources.libraryBook'],
    });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    return topic;
  }
}
