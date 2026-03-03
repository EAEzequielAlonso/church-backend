import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { LoanStatus } from '../enums/library.enums';
import { LibraryPolicy } from '../policies/library.policy';

/**
 * Cancel a loan request (before it reaches APPROVED state).
 * Only the borrower can cancel their own request.
 * Book.status does NOT change (was never RESERVED).
 */
@Injectable()
export class CancelLoanUseCase {
    constructor(
        @InjectRepository(Loan)
        private loanRepo: Repository<Loan>,
        private policy: LibraryPolicy,
    ) { }

    async execute(
        churchId: string,
        loanId: string,
        callerMemberId: string,
    ) {
        const loan = await this.loanRepo.findOne({
            where: { id: loanId, churchId },
        });
        if (!loan) throw new NotFoundException('Solicitud no encontrada');

        // Policy: validates REQUESTED status + caller is the borrower
        this.policy.assertCanCancelLoan(loan, callerMemberId);

        loan.status = LoanStatus.CANCELLED;
        // Book.status remains AVAILABLE — never changed during REQUESTED state
        return this.loanRepo.save(loan);
    }
}
