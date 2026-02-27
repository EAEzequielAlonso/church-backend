import { Controller, Get, Post, Body, Param, UseGuards, Query, Put, Delete, Request, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { EcclesiasticalRole, FunctionalRole } from '../common/enums';
import { CurrentChurch } from '../common/decorators';

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
import { BookStatus, LoanStatus } from '../common/enums/library.enums';

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
    ) { }

    // --- CATEGORIES ---
    @Get('categories')
    async findAllCategories() {
        return this.getCategories.execute();
    }

    // --- BOOKS ---
    @Get('books')
    async findAllBooks(
        @CurrentChurch() churchId: string,
        @Query('search') search?: string,
        @Query('categoryId') categoryId?: string,
        @Query('status') status?: BookStatus,
        @Query('availability') availability?: 'AVAILABLE' | 'UNAVAILABLE',
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10
    ) {
        return this.getBooks.execute(churchId, { search, categoryId, status, availability }, page, limit);
    }

    @Post('books')
    async create(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Body() dto: CreateBookDto
    ) {
        // Pass userId and memberId (from token)
        return this.createBook.execute(churchId, req.user.id, req.user.memberId, req.user.roles, dto);
    }

    @Put('books/:id')
    async update(
        @CurrentChurch() churchId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req,
        @Body() dto: UpdateBookDto
    ) {
        return this.updateBook.execute(churchId, id, req.user.memberId, dto);
    }

    @Delete('books/:id')
    async remove(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.deleteBook.execute(churchId, id, req.user.memberId);
    }

    // --- LOANS ---
    @Get('loans')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    async findAllLoans(
        @CurrentChurch() churchId: string,
        @Query('status') status?: LoanStatus,
        @Query('borrowerId') borrowerId?: string
    ) {
        return this.getLoans.execute(churchId, { status, borrowerId });
    }

    @Get('my-loans')
    async findMyLoans(
        @CurrentChurch() churchId: string,
        @Request() req
    ) {
        return this.getMyLoans.execute(churchId, req.user.memberId);
    }

    @Post('loans/request')
    async request(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Body() dto: RequestLoanDto
    ) {
        return this.requestLoan.execute(churchId, req.user.memberId, dto);
    }

    @Post('loans/:id/approve')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    async approve(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string
    ) {
        return this.approveLoan.execute(churchId, id, req.user.id);
    }

    @Post('loans/:id/deliver')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    async deliver(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: LoanActionDto
    ) {
        return this.markDelivered.execute(churchId, id, req.user.id, dto);
    }

    @Post('loans/:id/return')
    @Roles(FunctionalRole.LIBRARIAN, EcclesiasticalRole.PASTOR)
    async returnBook(
        @CurrentChurch() churchId: string,
        @Request() req,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: LoanActionDto
    ) {
        return this.markReturned.execute(churchId, id, req.user.id, dto);
    }
}
