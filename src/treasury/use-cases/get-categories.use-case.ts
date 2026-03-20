import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { TransactionType } from '../enums/treasury.enums';

@Injectable()
export class GetCategoriesUseCase {
    constructor(
        @InjectRepository(TransactionCategory)
        private readonly categoryRepo: Repository<TransactionCategory>,
    ) { }

    async execute(churchId: string, type?: string) {
        const queryBuilder = this.categoryRepo
            .createQueryBuilder('category')
            .where('category.churchId = :churchId', { churchId });

        if (type) {
            queryBuilder.andWhere('category.type = :type', {
                type: type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
            });
        }

        queryBuilder.orderBy('category.type', 'ASC').addOrderBy('category.name', 'ASC');

        const categories = await queryBuilder.getMany();

        // Add hasTransactions flag
        const txRepo = this.categoryRepo.manager.getRepository('treasury_transactions');
        return Promise.all(
            categories.map(async (cat) => {
                const hasTransactions = await txRepo.count({
                    where: { category: { id: cat.id } },
                });
                return {
                    ...cat,
                    hasTransactions: hasTransactions > 0,
                };
            }),
        );
    }
}
