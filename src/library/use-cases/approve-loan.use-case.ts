import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { Book } from '../entities/book.entity';
import { LoanStatus, BookStatus } from '../../common/enums/library.enums';

@Injectable()
export class ApproveLoanUseCase {
    constructor(private dataSource: DataSource) { }

    async execute(churchId: string, loanId: string, approverUserId: string) {
        return this.dataSource.transaction(async manager => {
            const loanRepo = manager.getRepository(Loan);
            const bookRepo = manager.getRepository(Book);

            const loan = await loanRepo.findOne({
                where: { id: loanId, church: { id: churchId } },
                relations: ['book']
            });

            if (!loan) throw new NotFoundException('Solicitud no encontrada');

            if (loan.status !== LoanStatus.REQUESTED) {
                throw new BadRequestException('La solicitud no está en estado pendiente (REQUESTED)');
            }

            // Race Condition Check: Is Book still AVAILABLE?
            // Someone else might have been approved/delivered in parallel?
            // Since we lock rows or check status:
            const book = await bookRepo.findOne({ where: { id: loan.bookId } });
            if (book.status !== BookStatus.AVAILABLE) {
                // Auto-reject or fail?
                throw new BadRequestException('El libro ya no está disponible (fue prestado a otra persona)');
            }

            // Update Loan
            loan.status = LoanStatus.APPROVED;
            loan.approvedAt = new Date();
            loan.approvedByUserId = approverUserId;

            // Book status remains AVAILABLE until DELIVERED? Or should we reserve it?
            // Requirement: "Book is AVAILABLE only if NO loans exist with status APPROVED or DELIVERED"
            // So if we set to APPROVED, it conceptually becomes UNAVAILABLE for others.
            // But Book.status enum might not have 'RESERVED'. 
            // Let's keep Book.status as AVAILABLE until physical delivery? 
            // OR strictly follow: "Book is AVAILABLE only if NO loans exist with status APPROVED..."
            // If we mark loan APPROVED, getBooksUseCase will see it as UNAVAILABLE because of the JOIN check logic we implemented/planned.
            // But explicitly setting Book.status helps performance.
            // The requirement says "Book.status = BORROWED" only on Delivery.
            // So on Approval, book is "Reserved". Let's update BookStatus to LOANED or add RESERVED?
            // "Book.status = LOANED // Computed: Has active loan (APPROVED/DELIVERED)" from my enum update.
            // So YES, we should set Book.status = LOANED here to block others.

            book.status = BookStatus.LOANED;
            await bookRepo.save(book);

            return loanRepo.save(loan);
        });
    }
}
