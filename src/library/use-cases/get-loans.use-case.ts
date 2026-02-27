import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { LoanStatus } from '../../common/enums/library.enums';

interface GetLoansFilter {
    status?: LoanStatus;
    borrowerId?: string;
    bookId?: string;
}

@Injectable()
export class GetLoansUseCase {
    constructor(
        @InjectRepository(Loan)
        private loanRepo: Repository<Loan>,
    ) { }

    async execute(churchId: string, filters: GetLoansFilter) {
        const query = this.loanRepo.createQueryBuilder('loan')
            .leftJoinAndSelect('loan.book', 'book')
            .leftJoinAndSelect('book.category', 'category') // Helpful context
            .leftJoinAndSelect('loan.borrower', 'borrower')
            .leftJoinAndSelect('borrower.person', 'person')
            .where('loan.churchId = :churchId', { churchId });

        if (filters.status) {
            query.andWhere('loan.status = :status', { status: filters.status });
        }

        if (filters.borrowerId) {
            query.andWhere('loan.borrowerId = :borrowerId', { borrowerId: filters.borrowerId });
        }

        if (filters.bookId) {
            query.andWhere('loan.bookId = :bookId', { bookId: filters.bookId });
        }

        query.orderBy('loan.createdAt', 'DESC');

        return query.getMany();
    }
}
