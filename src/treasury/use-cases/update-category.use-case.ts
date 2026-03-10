import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class UpdateCategoryUseCase {
    constructor(
        @InjectRepository(TransactionCategory)
        private readonly categoryRepo: Repository<TransactionCategory>,
    ) { }

    async execute(id: string, churchId: string, dto: UpdateCategoryDto) {
        const category = await this.categoryRepo.findOne({
            where: { id, churchId },
        });
        if (!category) throw new NotFoundException('Category not found');
        Object.assign(category, dto);
        return this.categoryRepo.save(category);
    }
}
