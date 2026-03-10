import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FunctionalRole } from '../../common/enums';
import { Account } from '../entities/account.entity';

@Injectable()
export class TreasuryPolicy {
  // ─── Permission Assertions ─────────────────────────────────────────────────

  /**
   * Only TREASURER can create, edit, or delete financial data.
   */
  assertCanManage(roles: string[]): void {
    if (!roles.includes(FunctionalRole.TREASURER)) {
      throw new ForbiddenException(
        'Solo el Tesorero puede realizar esta acción.',
      );
    }
  }

  /**
   * TREASURER, ADMIN_CHURCH, and AUDITOR can read financial data.
   */
  assertCanRead(roles: string[]): void {
    const allowed = [
      FunctionalRole.TREASURER,
      FunctionalRole.ADMIN_CHURCH,
      FunctionalRole.AUDITOR,
    ];
    if (!roles.some((r) => allowed.includes(r as FunctionalRole))) {
      throw new ForbiddenException(
        'No tiene permisos para ver datos de tesorería.',
      );
    }
  }

  // ─── Domain Validations ────────────────────────────────────────────────────

  /**
   * Amount must be positive.
   */
  validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero.');
    }
  }

  /**
   * Source and destination accounts must exist and be different.
   */
  validateTransactionFlow(source?: Account, destination?: Account): void {
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
}
