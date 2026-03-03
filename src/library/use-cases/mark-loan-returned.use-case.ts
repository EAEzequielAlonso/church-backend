import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { Book } from '../entities/book.entity';
import { LoanStatus, BookStatus, BookOwnershipType } from '../enums/library.enums';
import { LibraryPolicy } from '../policies/library.policy';
import { LoanActionDto } from '../dto/loan.dto';
import { CreateNotificationUseCase } from '../../notifications/use-cases/create-notification.use-case';
import { NotificationType } from '../../notifications/entities/notification.entity';

@Injectable()
export class MarkLoanReturnedUseCase {
  constructor(
    private dataSource: DataSource,
    private policy: LibraryPolicy,
    private notificationUseCase: CreateNotificationUseCase,
  ) { }

  async execute(
    churchId: string,
    loanId: string,
    callerMemberId: string,
    callerRoles: string[],
    dto: LoanActionDto,
  ) {
    const savedLoan = await this.dataSource.transaction(async (manager) => {
      const loanRepo = manager.getRepository(Loan);
      const bookRepo = manager.getRepository(Book);

      const loan = await loanRepo.findOne({
        where: { id: loanId, churchId },
        relations: ['book'],
      });
      if (!loan) throw new NotFoundException('Préstamo no encontrado');

      const book = await bookRepo.findOne({
        where: { id: loan.bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Libro no encontrado');

      loan.book = book;
      this.policy.assertCanReturnLoan(
        loan as Loan & { book: Book },
        callerRoles,
        callerMemberId,
      );

      loan.status = LoanStatus.RETURNED;
      loan.returnedAt = new Date();
      loan.returnedConfirmedByUserId = callerMemberId;
      if (dto?.condition) loan.conditionAtReturn = dto.condition;

      book.status = BookStatus.AVAILABLE;

      await bookRepo.save(book);
      return loanRepo.save(loan);
    });

    // Notify the book owner if it's a MEMBER book (fire-and-forget)
    const book = savedLoan.book;
    if (
      book?.ownershipType === BookOwnershipType.MEMBER &&
      book?.ownerMemberId &&
      book.ownerMemberId !== savedLoan.borrowerId
    ) {
      this.notificationUseCase.execute({
        churchId,
        userId: book.ownerMemberId,
        type: NotificationType.LOAN_RETURNED,
        title: 'Tu libro fue devuelto',
        message: `El libro "${book.title}" fue devuelto y está disponible nuevamente.`,
        entityType: 'LOAN',
        entityId: savedLoan.id,
      }).catch(() => { });
    }

    return savedLoan;
  }
}
