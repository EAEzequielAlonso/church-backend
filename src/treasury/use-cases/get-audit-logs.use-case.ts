import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { AuditAction, AuditEntityType } from '../enums/treasury.enums';

export interface GetAuditLogsFilterDto {
  startDate?: Date;
  endDate?: Date;
  entityType?: AuditEntityType;
  action?: AuditAction;
  userId?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class GetAuditLogsUseCase {
  constructor(
    @InjectRepository(TreasuryAuditLog)
    private readonly auditRepo: Repository<TreasuryAuditLog>,
  ) { }

  async execute(churchId: string, filters: GetAuditLogsFilterDto = {}) {
    const {
      startDate,
      endDate,
      entityType,
      action,
      userId,
      entityId,
      limit = 20,
      offset = 0,
    } = filters;

    const qb = this.auditRepo.createQueryBuilder('log')
      .where('log.churchId = :churchId', { churchId });

    if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }
    if (entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType });
    }
    if (action) {
      qb.andWhere('log.action = :action', { action });
    }
    if (userId) {
      qb.andWhere('log.performedByUserId = :userId', { userId });
    }
    if (entityId) {
      qb.andWhere('log.entityId = :entityId', { entityId });
    }

    qb.orderBy('log.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      limit,
      offset,
    };
  }
}

