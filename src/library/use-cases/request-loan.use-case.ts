import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { Book } from '../entities/book.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { RequestLoanDto } from '../dto/loan.dto';
import { BookStatus, LoanStatus } from '../../common/enums/library.enums';

@Injectable()
export class RequestLoanUseCase {
    constructor(
        private dataSource: DataSource,
        @InjectRepository(ChurchPerson)
        private memberRepo: Repository<ChurchPerson>,
    ) { }

    async execute(churchId: string, memberId: string, dto: RequestLoanDto) {
        return this.dataSource.transaction(async manager => {
            const bookRepo = manager.getRepository(Book);
            const loanRepo = manager.getRepository(Loan);

            // Lock book? Optimistic concurrency usually enough, but let's check status.
            const book = await bookRepo.findOne({
                where: { id: dto.bookId, church: { id: churchId } },
                relations: ['ownerMember'] // To check if borrower is owner
            });

            if (!book) throw new NotFoundException('Libro no encontrado');

            // 1. Check Availability
            // Strict check: if status != AVAILABLE, reject.
            if (book.status !== BookStatus.AVAILABLE) {
                throw new BadRequestException('El libro no está disponible actualmente');
            }

            // 2. Check Ownership
            // Cannot borrow own book (if member owned)
            if (book.ownerMemberId === memberId) {
                throw new BadRequestException('No puedes solicitar un préstamo de tu propio libro');
            }

            // 3. Check for Existing Active/Requested Loans by same user for same book?
            const existingLoan = await loanRepo.findOne({
                where: {
                    book: { id: dto.bookId },
                    borrower: { id: memberId },
                    status: LoanStatus.REQUESTED // Or active?
                }
            });

            if (existingLoan) throw new BadRequestException('Ya tienes una solicitud pendiente para este libro');

            // 4. Create Loan Request
            const borrower = await this.memberRepo.findOne({ where: { id: memberId } });
            if (!borrower) throw new NotFoundException('Miembro no encontrado');

            const durationDays = dto.durationDays || 14;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + durationDays);

            const loan = loanRepo.create({
                book,
                borrower,
                church: { id: churchId },
                requestedAt: new Date(),
                dueDate,
                status: LoanStatus.REQUESTED
            });

            return loanRepo.save(loan);
        });
    }
}
