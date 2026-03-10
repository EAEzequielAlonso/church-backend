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
        const where: any = { churchId };
        if (type)
            where.type =
                type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;

        return this.categoryRepo.find({
            where,
            order: { type: 'ASC', name: 'ASC' },
        });
    }
}
