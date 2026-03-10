import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { CreateCategoryDto } from '../dto/category.dto';

@Injectable()
export class CreateCategoryUseCase {
    constructor(
        @InjectRepository(TransactionCategory)
        private readonly categoryRepo: Repository<TransactionCategory>,
    ) { }

    async execute(dto: CreateCategoryDto, churchId: string) {
        const category = this.categoryRepo.create({
            ...dto,
            churchId: churchId,
        });
        return this.categoryRepo.save(category);
    }
}
