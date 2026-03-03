import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { Book } from '../entities/book.entity';
import { LoanStatus } from '../enums/library.enums';
import { LibraryPolicy } from '../policies/library.policy';
import { CreateNotificationUseCase } from '../../notifications/use-cases/create-notification.use-case';
import { NotificationType } from '../../notifications/entities/notification.entity';

/**
 * Reject a loan request (before it reaches APPROVED state).
 * CHURCH books: LIBRARIAN only.
 * MEMBER books: the book owner only.
 * Book.status does NOT change (was never RESERVED).
 */
@Injectable()
export class RejectLoanUseCase {
    constructor(
        private dataSource: DataSource,
        private policy: LibraryPolicy,
        private notificationUseCase: CreateNotificationUseCase,
    ) { }

    async execute(
        churchId: string,
        loanId: string,
        rejecterMemberId: string,
        rejecterRoles: string[],
    ) {
        const savedLoan = await this.dataSource.transaction(async (manager) => {
            const loanRepo = manager.getRepository(Loan);

            const loan = await loanRepo.findOne({
                where: { id: loanId, churchId },
                relations: ['book'],
            });
            if (!loan) throw new NotFoundException('Solicitud no encontrada');

            this.policy.assertCanRejectLoan(
                loan as Loan & { book: Book },
                rejecterRoles,
                rejecterMemberId,
            );

            loan.status = LoanStatus.REJECTED;
            return loanRepo.save(loan);
        });

        // Notify the borrower that their request was rejected (fire-and-forget)
        this.notificationUseCase.execute({
            churchId,
            userId: savedLoan.borrowerId,
            type: NotificationType.LOAN_REJECTED,
            title: 'Tu solicitud fue rechazada',
            message: 'Tu solicitud de préstamo fue rechazada. Podés buscar otro libro disponible.',
            entityType: 'LOAN',
            entityId: savedLoan.id,
        }).catch(() => { });

        return savedLoan;
    }
}
