import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { Book } from '../entities/book.entity';
import { LoanStatus, BookStatus } from '../enums/library.enums';
import { LibraryPolicy } from '../policies/library.policy';
import { CreateNotificationUseCase } from '../../notifications/use-cases/create-notification.use-case';
import { NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class ApproveLoanUseCase {
  constructor(
    private dataSource: DataSource,
    private policy: LibraryPolicy,
    private notificationUseCase: CreateNotificationUseCase,
  ) { }

  async execute(
    churchId: string,
    loanId: string,
    approverMemberId: string,
    approverRoles: string[],
  ) {
    const savedLoan = await this.dataSource.transaction(async (manager) => {
      const loanRepo = manager.getRepository(Loan);
      const bookRepo = manager.getRepository(Book);

      const loan = await loanRepo.findOne({
        where: { id: loanId, churchId },
        relations: ['book'],
      });
      if (!loan) throw new NotFoundException('Solicitud no encontrada');

      // Lock the book row to prevent parallel approvals
      const book = await bookRepo.findOne({
        where: { id: loan.bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Libro no encontrado');

      loan.book = book;
      this.policy.assertCanApproveLoan(
        loan as Loan & { book: Book },
        approverRoles,
        approverMemberId,
      );

      loan.status = LoanStatus.APPROVED;
      loan.approvedAt = new Date();
      loan.approvedByUserId = approverMemberId;
      book.status = BookStatus.RESERVED;

      await bookRepo.save(book);
      return loanRepo.save(loan);
    });

    // Notify the borrower that their request was approved (fire-and-forget)
    this.notificationUseCase.execute({
      churchId,
      userId: savedLoan.borrowerId,
      type: NotificationType.LOAN_APPROVED,
      title: 'Tu solicitud fue aprobada',
      message: 'Tu solicitud de préstamo fue aprobada. Coordiná la entrega del libro.',
      entityType: 'LOAN',
      entityId: savedLoan.id,
    }).catch(() => { });

    return savedLoan;
  }
}
