import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { Book } from '../entities/book.entity';
import { LoanStatus, BookStatus } from '../enums/library.enums';
import { LoanActionDto } from '../dto/loan.dto';
import { LibraryPolicy } from '../policies/library.policy';

@Injectable()
export class MarkLoanDeliveredUseCase {
  constructor(
    private dataSource: DataSource,
    private policy: LibraryPolicy,
  ) { }

  async execute(
    churchId: string,
    loanId: string,
    delivererMemberId: string,
    delivererRoles: string[],
    dto: LoanActionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const loanRepo = manager.getRepository(Loan);
      const bookRepo = manager.getRepository(Book);

      const loan = await loanRepo.findOne({
        where: { id: loanId, churchId },
        relations: ['book'],
      });
      if (!loan) throw new NotFoundException('Préstamo no encontrado');

      // Policy: validates APPROVED status + RESERVED book + who can deliver
      this.policy.assertCanDeliverLoan(
        loan as Loan & { book: Book },
        delivererRoles,
        delivererMemberId,
      );

      // Update loan
      loan.status = LoanStatus.DELIVERED;
      loan.deliveredAt = new Date();
      loan.deliveredByUserId = delivererMemberId;
      loan.conditionAtLoan = dto.condition ?? loan.book.condition;

      // Book: RESERVED → LOANED
      loan.book.status = BookStatus.LOANED;
      await bookRepo.save(loan.book);

      return loanRepo.save(loan);
    });
  }
}
