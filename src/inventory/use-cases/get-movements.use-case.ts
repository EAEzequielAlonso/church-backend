import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryMovement } from '../entities/inventory-movement.entity';

export interface GetMovementsOptions {
    itemId?: string;
    page: number;
    limit: number;
}

export interface PaginatedMovementsResult {
    data: InventoryMovement[];
    total: number;
    page: number;
    lastPage: number;
}

@Injectable()
export class GetMovementsUseCase {
    constructor(
        @InjectRepository(InventoryMovement)
        private movementRepo: Repository<InventoryMovement>,
    ) { }

    async execute(
        churchId: string,
        options: GetMovementsOptions,
    ): Promise<PaginatedMovementsResult> {
        const { itemId, page, limit } = options;
        const skip = (page - 1) * limit;

        const qb = this.movementRepo
            .createQueryBuilder('mv')
            .leftJoinAndSelect('mv.item', 'item')
            .leftJoinAndSelect('mv.registeredBy', 'user')
            .leftJoinAndSelect('user.person', 'person')
            .where('mv.churchId = :churchId', { churchId })
            .orderBy('mv.date', 'DESC')
            .skip(skip)
            .take(limit);

        if (itemId) {
            qb.andWhere('mv.itemId = :itemId', { itemId });
        }

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
            total,
            page,
            lastPage: Math.ceil(total / limit),
        };
    }
}
