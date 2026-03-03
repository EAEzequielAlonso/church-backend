import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Put,
  Delete,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CurrentChurch } from '../common/decorators';
import { FunctionalRole } from '../common/enums';

import { CreateBookDto, UpdateBookDto } from './dto/create-book.dto';
import { RequestLoanDto, LoanActionDto } from './dto/loan.dto';

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
import { BookStatus, LoanStatus } from './enums/library.enums';

@Controller('library')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LibraryController {
  constructor(
    private readonly getCategories: GetCategoriesUseCase,
    private readonly getBooks: GetBooksUseCase,
    private readonly createBook: CreateBookUseCase,
    private readonly updateBook: UpdateBookUseCase,
    private readonly deleteBook: SoftDeleteBookUseCase,

    private readonly getLoans: GetLoansUseCase,
    private readonly getMyLoans: GetMyLoansUseCase,
    private readonly requestLoan: RequestLoanUseCase,
    private readonly approveLoan: ApproveLoanUseCase,
    private readonly markDelivered: MarkLoanDeliveredUseCase,
    private readonly markReturned: MarkLoanReturnedUseCase,
    private readonly rejectLoan: RejectLoanUseCase,
    private readonly cancelLoan: CancelLoanUseCase,
  ) { }

  // ─── CATEGORIES ────────────────────────────────────────────────────────────

  @Get('categories')
  findAllCategories() {
    return this.getCategories.execute();
  }

  // ─── BOOKS ─────────────────────────────────────────────────────────────────

  @Get('books')
  findAllBooks(
    @CurrentChurch() churchId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: BookStatus,
    @Query('availability') availability?: 'AVAILABLE' | 'UNAVAILABLE',
    @Query('ownerMemberId') ownerMemberId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.getBooks.execute(
      churchId,
      { search, categoryId, status, availability, ownerMemberId },
      page,
      limit,
    );
  }

  @Post('books')
  createBookHandler(
    @CurrentChurch() churchId: string,
    @Request() req,
    @Body() dto: CreateBookDto,
  ) {
    return this.createBook.execute(
      churchId,
      req.user.memberId,
      req.user.roles as string[],
      dto,
    );
  }

  @Put('books/:id')
  updateBookHandler(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: UpdateBookDto,
  ) {
    return this.updateBook.execute(
      churchId,
      id,
      req.user.memberId,
      req.user.roles as string[],
      dto,
    );
  }

  @Delete('books/:id')
  deleteBookHandler(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.deleteBook.execute(
      churchId,
      id,
      req.user.memberId,
      req.user.roles as string[],
    );
  }

  // ─── LOANS ─────────────────────────────────────────────────────────────────

  /** All loans — LIBRARIAN only (admin view) */
  @Get('loans')
  @Roles(FunctionalRole.LIBRARIAN)
  findAllLoans(
    @CurrentChurch() churchId: string,
    @Query('status') status?: LoanStatus,
    @Query('borrowerId') borrowerId?: string,
    @Query('ownerMemberId') ownerMemberId?: string,
  ) {
    return this.getLoans.execute(churchId, { status, borrowerId, ownerMemberId });
  }

  /**
   * Loans for books owned by the current user (owner view).
   * Available to any authenticated member.
   */
  @Get('loans/my-book-loans')
  findMyBookLoans(@CurrentChurch() churchId: string, @Request() req) {
    return this.getLoans.execute(churchId, { ownerMemberId: req.user.memberId });
  }

  /** Loans belonging to the current user (borrower view) */
  @Get('my-loans')
  findMyLoans(@CurrentChurch() churchId: string, @Request() req) {
    return this.getMyLoans.execute(churchId, req.user.memberId);
  }

  /** Request a loan for a book */
  @Post('loans/request')
  requestLoanHandler(
    @CurrentChurch() churchId: string,
    @Request() req,
    @Body() dto: RequestLoanDto,
  ) {
    return this.requestLoan.execute(churchId, req.user.memberId, dto);
  }

  /**
   * Approve a loan request.
   * CHURCH books → LIBRARIAN only (enforced in UseCase via LibraryPolicy).
   * MEMBER books → book owner only (enforced in UseCase via LibraryPolicy).
   * No @Roles here — policy decides.
   */
  @Post('loans/:id/approve')
  approveHandler(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.approveLoan.execute(
      churchId,
      id,
      req.user.memberId,
      req.user.roles as string[],
    );
  }

  /**
   * Register physical delivery of a book.
   * Permission enforced in UseCase via LibraryPolicy.
   */
  @Post('loans/:id/deliver')
  deliverHandler(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: LoanActionDto,
  ) {
    return this.markDelivered.execute(
      churchId,
      id,
      req.user.memberId,
      req.user.roles as string[],
      dto,
    );
  }

  /**
   * Confirm physical return of a book.
   * CHURCH books → LIBRARIAN only.
   * MEMBER books → owner or LIBRARIAN.
   * Permission enforced in UseCase via LibraryPolicy.
   */
  @Post('loans/:id/return')
  returnHandler(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: LoanActionDto,
  ) {
    return this.markReturned.execute(
      churchId,
      id,
      req.user.memberId,
      req.user.roles as string[],
      dto,
    );
  }

  /**
   * Reject a loan request.
   * CHURCH books → LIBRARIAN only.
   * MEMBER books → book owner only.
   * Permission enforced in UseCase via LibraryPolicy.
   */
  @Post('loans/:id/reject')
  rejectHandler(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.rejectLoan.execute(
      churchId,
      id,
      req.user.memberId,
      req.user.roles as string[],
    );
  }

  /**
   * Cancel a loan request.
   * Only the borrower can cancel their own REQUESTED loan.
   * Permission enforced in UseCase via LibraryPolicy.
   */
  @Post('loans/:id/cancel')
  cancelHandler(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.cancelLoan.execute(
      churchId,
      id,
      req.user.memberId,
    );
  }
}
