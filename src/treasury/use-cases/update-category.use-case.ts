import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
        return this.categoryRepo.manager.transaction(async (manager) => {
            const categoryRepo = manager.getRepository(TransactionCategory);
            const txRepo = manager.getRepository('treasury_transactions');

            const category = await categoryRepo.findOne({
                where: { id, churchId },
            });
            if (!category) throw new NotFoundException('Categoría no encontrada');

            // 1. Validate type changes if transactions exist
            // Note: UpdateCategoryDto doesn't currently include 'type',
            // but if it ever does, we should protect it.
            const anyDto = dto as any;
            if (anyDto.type && anyDto.type !== category.type) {
                const hasTransactions = await txRepo.count({
                    where: { category: { id } },
                });

                if (hasTransactions > 0) {
                    throw new BadRequestException(
                        'No se puede cambiar el tipo de una categoría que ya tiene movimientos asociados.',
                    );
                }
            }

            Object.assign(category, dto);
            return categoryRepo.save(category);
        });
    }
}
