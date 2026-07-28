import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from '../entities/small-group.entity';
import { CreateSmallGroupDto } from '../dto/create-small-group.dto';
import { UpdateSmallGroupDto } from '../dto/update-small-group.dto';
import { FilterSmallGroupDto } from '../dto/filter-small-group.dto';
import { SmallGroupStatus } from '../enums/small-groups.enums';
import { EcosystemActivitiesService } from 'src/public/ecosystem/services/ecosystem-activities.service';
import {
  EcosystemActivityType,
  EcosystemActivityEntityType,
} from 'src/public/ecosystem/enums/ecosystem.enums';

import { SmallGroupsPolicies } from './small-groups.policies';

@Injectable()
export class SmallGroupsService {
  constructor(
    @InjectRepository(SmallGroup)
    private readonly smallGroupRepo: Repository<SmallGroup>,
    private readonly activitiesService: EcosystemActivitiesService,
    private readonly policies: SmallGroupsPolicies,
  ) {}

  async create(
    createDto: CreateSmallGroupDto,
    authenticatedUserId: string,
  ): Promise<SmallGroup> {
    await this.policies.canManageSmallGroup(
      authenticatedUserId,
      createDto.churchId,
    );
    await this.policies.canAssignLeader(createDto.leaderId, createDto.churchId);

    const smallGroup = this.smallGroupRepo.create(createDto);
    const savedGroup = await this.smallGroupRepo.save(smallGroup);

    // Dispatch activity
    await this.activitiesService.logActivity({
      activityType: EcosystemActivityType.SMALL_GROUP_CREATED,
      entityType: EcosystemActivityEntityType.SMALL_GROUP,
      entityId: savedGroup.id,
      actorChurchId: savedGroup.churchId,
      actorPersonId: savedGroup.leaderId,
      metadata: {
        name: savedGroup.name,
      },
    });

    return savedGroup;
  }

  async update(
    id: string,
    updateDto: UpdateSmallGroupDto,
    churchId: string,
    authenticatedUserId: string,
  ): Promise<SmallGroup> {
    const smallGroup = await this.findOne(id);

    if (smallGroup.churchId !== churchId) {
      throw new ForbiddenException(
        'Small group does not belong to the given church',
      );
    }

    await this.policies.canManageSmallGroup(authenticatedUserId, churchId);

    if (updateDto.leaderId) {
      await this.policies.canAssignLeader(updateDto.leaderId, churchId);
    }

    Object.assign(smallGroup, updateDto);
    return await this.smallGroupRepo.save(smallGroup);
  }

  async closeGroup(
    id: string,
    churchId: string,
    authenticatedUserId: string,
  ): Promise<SmallGroup> {
    const smallGroup = await this.findOne(id);

    if (smallGroup.churchId !== churchId) {
      throw new ForbiddenException(
        'Small group does not belong to the given church',
      );
    }

    await this.policies.canManageSmallGroup(authenticatedUserId, churchId);

    smallGroup.status = SmallGroupStatus.CLOSED;
    const savedGroup = await this.smallGroupRepo.save(smallGroup);

    // Dispatch activity
    await this.activitiesService.logActivity({
      activityType: EcosystemActivityType.SMALL_GROUP_CLOSED,
      entityType: EcosystemActivityEntityType.SMALL_GROUP,
      entityId: savedGroup.id,
      actorChurchId: savedGroup.churchId,
      actorPersonId: savedGroup.leaderId,
      metadata: {
        name: savedGroup.name,
      },
    });

    return savedGroup;
  }

  async delete(
    id: string,
    churchId: string,
    authenticatedUserId: string,
    confirmationText: string,
  ): Promise<void> {
    const smallGroup = await this.findOne(id);

    if (smallGroup.churchId !== churchId) {
      throw new ForbiddenException(
        'Small group does not belong to the given church',
      );
    }

    await this.policies.canManageSmallGroup(authenticatedUserId, churchId);

    if (confirmationText !== `ELIMINAR ${smallGroup.name}`) {
      throw new BadRequestException(
        'Confirmation text does not match the exact group name pattern',
      );
    }

    // Limpiar activities huerfanas
    await this.activitiesService.deleteActivitiesByEntity(
      EcosystemActivityEntityType.SMALL_GROUP,
      smallGroup.id,
    );

    // Hard delete
    await this.smallGroupRepo.remove(smallGroup);
  }

  async findOne(id: string): Promise<SmallGroup> {
    const smallGroup = await this.smallGroupRepo.findOne({
      where: { id },
      relations: ['leader', 'church', 'originMission'],
    });

    if (!smallGroup) {
      throw new NotFoundException(`SmallGroup with ID ${id} not found`);
    }

    return smallGroup;
  }

  async findAll(filters: FilterSmallGroupDto): Promise<[SmallGroup[], number]> {
    const qb = this.smallGroupRepo
      .createQueryBuilder('sg')
      .leftJoinAndSelect('sg.leader', 'leader')
      .leftJoinAndSelect('sg.church', 'church');

    if (filters.churchId) {
      qb.andWhere('sg.churchId = :churchId', { churchId: filters.churchId });
    }

    if (filters.status) {
      qb.andWhere('sg.status = :status', { status: filters.status });
    }

    if (filters.meetingDay) {
      qb.andWhere('sg.meetingDay = :meetingDay', {
        meetingDay: filters.meetingDay,
      });
    }

    if (filters.q) {
      qb.andWhere('(sg.name ILIKE :q OR sg.description ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    // Geographic bounds filtering
    if (filters.neLat && filters.swLat && filters.neLng && filters.swLng) {
      qb.andWhere('sg.latitude <= :neLat', { neLat: filters.neLat })
        .andWhere('sg.latitude >= :swLat', { swLat: filters.swLat })
        .andWhere('sg.longitude <= :neLng', { neLng: filters.neLng })
        .andWhere('sg.longitude >= :swLng', { swLng: filters.swLng });
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    qb.skip(offset).take(limit);
    qb.orderBy('sg.createdAt', 'DESC');

    return await qb.getManyAndCount();
  }

  async mapSummary(id: string) {
    const smallGroup = await this.smallGroupRepo.findOne({ where: { id } });
    if (!smallGroup) return null;
    return {
      id: smallGroup.id,
      title: smallGroup.name,
      type: 'SMALL_GROUP',
      description: smallGroup.description?.slice(0, 150) ?? null,
      city: smallGroup.city,
      state: smallGroup.state,
      ctaLink: `/small-groups/${smallGroup.id}`,
    };
  }
}
