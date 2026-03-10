import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryPolicy } from '../policies/treasury.policy';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionStatus, AuditEntityType, AuditAction } from '../enums/treasury.enums';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { snapshotTransaction } from '../helpers/audit-snapshot.helper';

interface UpdateTransactionDto {
  id: string;
  churchId: string;
  userId: string;
  userRole?: string;
  userEmail?: string;
  ipAddress?: string;
  // Only non-financial fields allowed for COMPLETED
  description?: string;
  ministryId?: string;
  reason?: string;
  // Financial fields — only allowed for PENDING_APPROVAL
  amount?: number;
  sourceAccountId?: string;
  destinationAccountId?: string;
  categoryId?: string;
  date?: string;
}

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly policy: TreasuryPolicy,
  ) { }

  async execute(dto: UpdateTransactionDto): Promise<TreasuryTransaction> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(TreasuryTransaction);
      const auditRepo = manager.getRepository(TreasuryAuditLog);

      const tx = await txRepo.findOne({
        where: { id: dto.id, churchId: dto.churchId },
        relations: ['sourceAccount', 'destinationAccount', 'category', 'ministry'],
      });

      if (!tx) throw new NotFoundException('Transacción no encontrada.');

      const beforeSnapshot = snapshotTransaction(tx);

      if (tx.status === TransactionStatus.COMPLETED) {
        const financialFields = [
          'amount',
          'currency',
          'sourceAccountId',
          'destinationAccountId',
          'categoryId',
          'date',
        ];
        const attemptedFinancial = financialFields.filter(
          (f) => dto[f] !== undefined,
        );

        if (attemptedFinancial.length > 0) {
          throw new BadRequestException(
            'No se pueden modificar campos financieros de una transacción completada. ' +
            'Use la función de corrección para modificar monto, cuentas, categoría o fecha.',
          );
        }

        if (dto.description !== undefined) tx.description = dto.description;
        if (dto.ministryId !== undefined)
          tx.ministry = dto.ministryId
            ? ({ id: dto.ministryId } as any)
            : null;

        const saved = await txRepo.save(tx);

        await auditRepo.save(auditRepo.create({
          churchId: dto.churchId,
          entityType: AuditEntityType.TRANSACTION,
          entityId: tx.id,
          action: AuditAction.UPDATE,
          before: beforeSnapshot,
          after: snapshotTransaction(saved),
          entityVersion: 'v1',
          performedByUserId: dto.userId,
          performedByEmail: dto.userEmail || null,
          performedByRole: dto.userRole || null,
          ipAddress: dto.ipAddress || null,
          reason: dto.reason || null,
        }));

        return saved;
      }

      // PENDING_APPROVAL: full edit allowed (no balance impact)
      if (dto.description !== undefined) tx.description = dto.description;
      if (dto.amount !== undefined) {
        this.policy.validateAmount(dto.amount);
        tx.amount = dto.amount;
      }
      if (dto.ministryId !== undefined)
        tx.ministry = dto.ministryId ? ({ id: dto.ministryId } as any) : null;

      const saved = await txRepo.save(tx);

      await auditRepo.save(auditRepo.create({
        churchId: dto.churchId,
        entityType: AuditEntityType.TRANSACTION,
        entityId: tx.id,
        action: AuditAction.UPDATE,
        before: beforeSnapshot,
        after: snapshotTransaction(saved),
        entityVersion: 'v1',
        performedByUserId: dto.userId,
        performedByEmail: dto.userEmail || null,
        performedByRole: dto.userRole || null,
        ipAddress: dto.ipAddress || null,
        reason: dto.reason || null,
      }));

      return saved;
    });
  }
}
