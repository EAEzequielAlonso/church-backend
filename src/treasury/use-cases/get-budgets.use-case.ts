import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';

@Injectable()
export class GetBudgetsUseCase {
    constructor(
        @InjectRepository(Budget)
        private readonly budgetRepo: Repository<Budget>,
    ) { }

    async execute(churchId: string, year?: number, month?: number) {
        const where: any = { churchId };
        if (year) where.year = year;
        if (month) where.month = month;

        return this.budgetRepo.find({
            where,
            relations: ['lines', 'lines.ministry', 'lines.category'],
            order: { year: 'DESC', month: 'DESC' },
        });
    }
}
