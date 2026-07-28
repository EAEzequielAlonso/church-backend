import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedInformation } from '../entities/need-information.entity';
import { InformationFilterDto } from '../dto/church-need-signals/information-filter.dto';
import { NeedInformationEntityType } from '../enums/need-signals.enum';

@Injectable()
export class ListNeedSignalInformationUseCase {
  constructor(
    @InjectRepository(NeedInformation)
    private readonly needInformationRepository: Repository<NeedInformation>,
  ) {}

  async execute(signalId: string, filterDto: InformationFilterDto) {
    const { category, page = 1, limit = 10 } = filterDto;

    const query = this.needInformationRepository
      .createQueryBuilder('info')
      .leftJoinAndSelect('info.person', 'person')
      .where('info.entityType = :entityType', {
        entityType: NeedInformationEntityType.NEED_SIGNAL,
      })
      .andWhere('info.entityId = :signalId', { signalId });

    if (category) {
      query.andWhere('info.category = :category', { category });
    }

    query.orderBy('info.createdAt', 'DESC');
    query.skip((page - 1) * limit);
    query.take(limit);

    const [items, total] = await query.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
