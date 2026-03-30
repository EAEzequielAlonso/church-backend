import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryController } from './library.controller';
import { Book } from './entities/book.entity';
import { Loan } from './entities/loan.entity';
import { BookCategory } from './entities/book-category.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { LibraryPolicy } from './policies/library.policy';

// Use Cases
import { GetCategoriesUseCase } from './use-cases/get-categories.use-case';
import { GetBooksUseCase } from './use-cases/get-books.use-case';
import { CreateBookUseCase } from './use-cases/create-book.use-case';
import { UpdateBookUseCase } from './use-cases/update-book.use-case';
import { SoftDeleteBookUseCase } from './use-cases/soft-delete-book.use-case';
import { GetLoansUseCase } from './use-cases/get-loans.use-case';
import { GetMyLoansUseCase } from './use-cases/get-my-loans.use-case';
import { RequestLoanUseCase } from './use-cases/request-loan.use-case';
import { ApproveLoanUseCase } from './use-cases/approve-loan.use-case';
import { MarkLoanDeliveredUseCase } from './use-cases/mark-loan-delivered.use-case';
import { MarkLoanReturnedUseCase } from './use-cases/mark-loan-returned.use-case';
import { RejectLoanUseCase } from './use-cases/reject-loan.use-case';
import { CancelLoanUseCase } from './use-cases/cancel-loan.use-case';

const UseCases = [
  GetCategoriesUseCase,
  GetBooksUseCase,
  CreateBookUseCase,
  UpdateBookUseCase,
  SoftDeleteBookUseCase,
  GetLoansUseCase,
  GetMyLoansUseCase,
  RequestLoanUseCase,
  ApproveLoanUseCase,
  MarkLoanDeliveredUseCase,
  MarkLoanReturnedUseCase,
  RejectLoanUseCase,
  CancelLoanUseCase,
];

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, Loan, BookCategory, ChurchPerson]),
    NotificationsModule,
  ],
  controllers: [LibraryController],
  providers: [LibraryPolicy, ...UseCases],
  exports: [...UseCases],
})
export class LibraryModule {}
