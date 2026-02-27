import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { LoanStatus, BookStatus } from '../../common/enums/library.enums';
import { LoanActionDto } from '../dto/loan.dto';

@Injectable()
export class MarkLoanDeliveredUseCase {
    constructor(private dataSource: DataSource) { }

    async execute(churchId: string, loanId: string, delivererUserId: string, dto: LoanActionDto) {
        return this.dataSource.transaction(async manager => {
            const loanRepo = manager.getRepository(Loan);

            const loan = await loanRepo.findOne({
                where: { id: loanId, church: { id: churchId } },
                relations: ['book']
            });

            if (!loan) throw new NotFoundException('Préstamo no encontrado');

            if (loan.status !== LoanStatus.APPROVED) {
                throw new BadRequestException('El préstamo debe estar APROBADO antes de ser entregado');
            }

            loan.status = LoanStatus.DELIVERED;
            loan.deliveredAt = new Date();
            loan.deliveredByUserId = delivererUserId;

            if (dto.condition) {
                loan.conditionAtLoan = dto.condition;
            } else {
                // Inherit current book condition
                loan.conditionAtLoan = loan.book.condition;
            }

            // Book status is already LOANED from Approval step, but reinforce used logic
            loan.book.status = BookStatus.LOANED;
            await manager.save(loan.book);

            return loanRepo.save(loan);
        });
    }
}
