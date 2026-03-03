import { Injectable, BadRequestException } from '@nestjs/common';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { Account } from '../entities/account.entity';

@Injectable()
export class TreasuryPolicy {
  /**
   * Validates if a transaction can be modified.
   * Rules:
   * - Completed transactions might be restricted if period is closed (future).
   * - Rejected transactions cannot be modified.
   */
  canModifyTransaction(transaction: TreasuryTransaction): boolean {
    // Example Rule: Cannot edit if status is REJECTED (audit trail)
    // For MVP we allow editing everything except maybe if closed period.
    // For now, return true but place hook here.
    return true;
  }

  /**
   * Validates if accounts are valid for a transaction.
   * Rule: Source and Destination cannot be the same.
   * Rule: At least one account must be provided (Internal Transfer vs Income/Expense).
   * (Actually current model requires Source and Dest usually, but maybe Income has null source?
   *  Let's enforce strict logic: Transfer needs both. Expense needs Dest=Expense, Source=Asset. Income needs Source=Income, Dest=Asset)
   */
  validateTransactionFlow(source?: Account, destination?: Account) {
    if (!source && !destination) {
      throw new BadRequestException(
        'Debe especificar al menos una cuenta de origen o destino.',
      );
    }

    if (source?.id === destination?.id) {
      throw new BadRequestException(
        'La cuenta de origen y destino no pueden ser la misma.',
      );
    }
  }

  /**
   * Ensures integrity of amount
   */
  validateAmount(amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }
  }
}
