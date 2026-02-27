import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Loan } from '../entities/loan.entity';
import { LoanStatus, BookStatus } from '../../common/enums/library.enums';
import { LoanActionDto } from '../dto/loan.dto';

@Injectable()
export class MarkLoanReturnedUseCase {
    constructor(private dataSource: DataSource) { }

    async execute(churchId: string, loanId: string, userId: string, dto: LoanActionDto) {
        return this.dataSource.transaction(async manager => {
            const loanRepo = manager.getRepository(Loan);

            const loan = await loanRepo.findOne({
                where: { id: loanId, church: { id: churchId } },
                relations: ['book']
            });

            if (!loan) throw new NotFoundException('Préstamo no encontrado');

            if (loan.status !== LoanStatus.DELIVERED) {
                throw new BadRequestException('Solo se pueden devolver préstamos que han sido ENTREGADOS');
            }

            loan.status = LoanStatus.RETURNED;
            loan.returnedAt = new Date();
            loan.returnedConfirmedByUserId = userId;

            if (dto.condition) {
                loan.conditionAtReturn = dto.condition;
                // Update Book condition history? 
                loan.book.condition = dto.condition; // Set current condition
            }

            // Update Book Status to AVAILABLE
            loan.book.status = BookStatus.AVAILABLE;
            await manager.save(loan.book);

            return loanRepo.save(loan);
        });
    }
}
