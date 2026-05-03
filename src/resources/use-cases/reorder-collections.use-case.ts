import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { StudyCollection } from '../entities/study-collection.entity';
import { ReorderDto } from '../dto/reorder.dto';

@Injectable()
export class ReorderCollectionsUseCase {
  constructor(
    @InjectRepository(StudyCollection)
    private collectionRepo: Repository<StudyCollection>,
    private dataSource: DataSource,
  ) {}

  async execute(churchId: string, dto: ReorderDto): Promise<void> {
    if (!dto.items || dto.items.length === 0) return;

    const ids = dto.items.map(i => i.id);
    const count = await this.collectionRepo.count({
      where: { id: In(ids), churchId },
    });

    if (count !== ids.length) {
      throw new BadRequestException('Una o más colecciones no pertenecen a esta iglesia.');
    }

    await this.dataSource.transaction(async manager => {
      for (const item of dto.items) {
        await manager.update(StudyCollection, { id: item.id, churchId }, { order: item.order });
      }
    });
  }
}
