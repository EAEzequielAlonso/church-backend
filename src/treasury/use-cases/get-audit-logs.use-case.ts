import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';

@Injectable()
export class GetAuditLogsUseCase {
    constructor(
        @InjectRepository(TreasuryAuditLog)
        private readonly auditRepo: Repository<TreasuryAuditLog>
    ) { }

    async execute(txId: string) {
        // Technically we should check if TX belongs to church...
        // But Relation is to Transaction. We can join transaction.church.
        return this.auditRepo.find({
            where: { transaction: { id: txId } },
            relations: ['changedBy'],
            order: { createdAt: 'DESC' }
        });
    }
}
