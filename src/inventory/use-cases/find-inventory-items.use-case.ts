import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';

export interface FindInventoryItemsFilters {
    ministryId?: string;
    category?: string;
    includeInactive?: boolean;
}

@Injectable()
export class FindInventoryItemsUseCase {
    constructor(
        @InjectRepository(InventoryItem)
        private itemRepo: Repository<InventoryItem>,
    ) { }

    async execute(
        churchId: string,
        filters: FindInventoryItemsFilters = {},
    ): Promise<InventoryItem[]> {
        const status = filters.includeInactive ? 'inactive' : 'active';

        const qb = this.itemRepo
            .createQueryBuilder('item')
            .leftJoinAndSelect('item.ministry', 'ministry')
            .where('item.churchId = :churchId', { churchId })
            .andWhere('item.status = :status', { status })
            .orderBy('item.name', 'ASC');

        if (filters.category) {
            qb.andWhere('item.category = :category', { category: filters.category });
        }
        if (filters.ministryId) {
            qb.andWhere('item.ministryId = :ministryId', { ministryId: filters.ministryId });
        }

        return qb.getMany();
    }
}
