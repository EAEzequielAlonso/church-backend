import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { StudyTopic } from '../entities/study-topic.entity';
import { ReorderDto } from '../dto/reorder.dto';

@Injectable()
export class ReorderTopicsUseCase {
  constructor(
    @InjectRepository(StudyTopic)
    private topicRepo: Repository<StudyTopic>,
    private dataSource: DataSource,
  ) {}

  async execute(churchId: string, dto: ReorderDto): Promise<void> {
    if (!dto.items || dto.items.length === 0) return;

    const ids = dto.items.map(i => i.id);
    const count = await this.topicRepo.count({
      where: { id: In(ids), churchId },
    });

    if (count !== ids.length) {
      throw new BadRequestException('Uno o más temas no pertenecen a esta iglesia.');
    }

    await this.dataSource.transaction(async manager => {
      for (const item of dto.items) {
        await manager.update(StudyTopic, { id: item.id, churchId }, { order: item.order });
      }
    });
  }
}
