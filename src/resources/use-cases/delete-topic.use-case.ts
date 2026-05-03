import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyTopic } from '../entities/study-topic.entity';

@Injectable()
export class DeleteTopicUseCase {
  constructor(
    @InjectRepository(StudyTopic)
    private topicRepo: Repository<StudyTopic>,
  ) {}

  async execute(churchId: string, id: string): Promise<void> {
    const topic = await this.topicRepo.findOne({ where: { id, churchId } });
    if (!topic) throw new NotFoundException('Tema no encontrado');
    await this.topicRepo.remove(topic);
  }
}
