import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { LoanStatus } from '../enums/library.enums';

interface GetLoansFilter {
  status?: LoanStatus;
  borrowerId?: string;
  bookId?: string;
  ownerMemberId?: string;
}

@Injectable()
export class GetLoansUseCase {
  constructor(
    @InjectRepository(Loan)
    private loanRepo: Repository<Loan>,
  ) { }

  async execute(churchId: string, filters: GetLoansFilter) {
    const query = this.loanRepo
      .createQueryBuilder('loan')
      // ── Book + its owner and category (single JOIN, no N+1) ───────────────
      .leftJoinAndSelect('loan.book', 'book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.ownerMember', 'bookOwner')
      .leftJoinAndSelect('bookOwner.person', 'ownerPerson')
      // ── Borrower ─────────────────────────────────────────────────────────
      .leftJoinAndSelect('loan.borrower', 'borrower')
      .leftJoinAndSelect('borrower.person', 'borrowerPerson')
      // ── Multi-tenancy filter (always applied first) ───────────────────────
      .where('loan.churchId = :churchId', { churchId });

    if (filters.status) {
      query.andWhere('loan.status = :status', { status: filters.status });
    }

    if (filters.borrowerId) {
      query.andWhere('loan.borrowerId = :borrowerId', {
        borrowerId: filters.borrowerId,
      });
    }

    if (filters.bookId) {
      query.andWhere('loan.bookId = :bookId', { bookId: filters.bookId });
    }

    if (filters.ownerMemberId) {
      query.andWhere('book.ownerMemberId = :ownerMemberId', {
        ownerMemberId: filters.ownerMemberId,
      });
    }

    query.orderBy('loan.createdAt', 'DESC');

    return query.getMany();
  }
}
