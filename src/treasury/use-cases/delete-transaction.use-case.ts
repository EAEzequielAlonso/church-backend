import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionStatus, AuditEntityType, AuditAction } from '../enums/treasury.enums';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { snapshotTransaction } from '../helpers/audit-snapshot.helper';

@Injectable()
export class DeleteTransactionUseCase {
  private readonly logger = new Logger(DeleteTransactionUseCase.name);

  constructor(private readonly dataSource: DataSource) { }

  async execute(
    id: string,
    churchId: string,
    userId: string,
    userRole?: string,
    userEmail?: string,
    ipAddress?: string,
  ): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const txRepo = manager.getRepository(TreasuryTransaction);
      const auditRepo = manager.getRepository(TreasuryAuditLog);

      if (!userId)
        throw new BadRequestException(
          'No se identificó al usuario que realiza la acción.',
        );

      const tx = await txRepo.findOne({
        where: { id, churchId },
        relations: ['sourceAccount', 'destinationAccount', 'category', 'ministry'],
      });

      if (!tx)
        throw new NotFoundException(
          'La transacción no fue encontrada o no pertenece a esta iglesia.',
        );

      // COMPLETED transactions CANNOT be deleted — only corrected
      if (tx.status === TransactionStatus.COMPLETED) {
        throw new BadRequestException(
          'No se puede eliminar una transacción completada. ' +
          'Use la función de corrección para revertir el movimiento.',
        );
      }

      // Capture snapshot before deletion
      const beforeSnapshot = snapshotTransaction(tx);

      // Hard delete for PENDING (never impacted balances)
      await txRepo.remove(tx);

      // Audit log (after remove, so it persists without CASCADE)
      await auditRepo.save(auditRepo.create({
        churchId,
        entityType: AuditEntityType.TRANSACTION,
        entityId: id, // Use original id since tx.id may be cleared after remove
        action: AuditAction.DELETE,
        before: beforeSnapshot,
        after: null,
        entityVersion: 'v1',
        performedByUserId: userId,
        performedByEmail: userEmail || null,
        performedByRole: userRole || null,
        ipAddress: ipAddress || null,
      }));

      return { success: true };
    });
  }
}
