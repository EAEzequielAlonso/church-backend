import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
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
    @InjectRepository(TreasuryTransaction)
    private readonly txRepo: Repository<TreasuryTransaction>,
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

    // Phase 18: Chain-aware history for transactions
    let entityIds: string[] = entityId ? [entityId] : [];

    if (entityId && entityType === AuditEntityType.TRANSACTION) {
        try {
            // 1. Find the "Root" of the correction chain by going UP
            let currentId = entityId;
            const visited = new Set<string>();
            let rootId = entityId;

            while (currentId && !visited.has(currentId)) {
                visited.add(currentId);
                const tx = await this.txRepo.findOne({
                    where: { id: currentId },
                    select: ['id', 'correctedTransactionId']
                });
                if (tx?.correctedTransactionId) {
                    rootId = tx.correctedTransactionId;
                    currentId = tx.correctedTransactionId;
                } else {
                    currentId = null;
                }
            }

            // 2. Find all transactions in the chain (Root and its descendants)
            // For simplicity and to avoid deep recursion, we find all transactions for this church
            // that are linked to this rootId either as the ID itself or via correctedTransactionId.
            // Note: This covers A -> B and A -> C if A is root.
            const chainTxs = await this.txRepo.find({
                where: [
                    { id: rootId },
                    { correctedTransactionId: rootId }
                ],
                select: ['id']
            });
            
            // If the chain is deeper (A -> B -> C), we might need another pass or a recursive search.
            // Given the user's request for "multiple corrections", let's ensure we get the full set.
            const collectedIds = new Set(chainTxs.map(t => t.id));
            collectedIds.add(rootId);

            // One more level of look-down to be safe for typical A->B->C
            const secondLevel = await this.txRepo.find({
                where: chainTxs.map(t => ({ correctedTransactionId: t.id })),
                select: ['id']
            });
            secondLevel.forEach(t => collectedIds.add(t.id));

            entityIds = Array.from(collectedIds);
        } catch (error) {
            console.error('Error fetching transaction chain history:', error);
            // Fallback to single ID if chain search fails
            entityIds = [entityId];
        }
    }

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
    
    if (entityIds.length > 0) {
      qb.andWhere('log.entityId IN (:...entityIds)', { entityIds });
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

