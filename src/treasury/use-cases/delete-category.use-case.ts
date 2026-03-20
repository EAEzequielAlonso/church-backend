import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';

@Injectable()
export class DeleteCategoryUseCase {
    constructor(
        @InjectRepository(TransactionCategory)
        private readonly categoryRepo: Repository<TransactionCategory>,
        @InjectRepository(TreasuryTransaction)
        private readonly txRepo: Repository<TreasuryTransaction>,
    ) { }

    async execute(id: string, churchId: string) {
        const category = await this.categoryRepo.findOne({
            where: { id, churchId },
        });
        if (!category) throw new NotFoundException('Categoría no encontrada');

        const hasTransactions = await this.txRepo.count({
            where: { category: { id } },
        });
        if (hasTransactions > 0)
            throw new BadRequestException(
                'Cannot delete category with associated transactions.',
            );

        return this.categoryRepo.remove(category);
    }
}
