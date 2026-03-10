import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';

@Injectable()
export class FindInventoryItemUseCase {
    constructor(
        @InjectRepository(InventoryItem)
        private itemRepo: Repository<InventoryItem>,
    ) { }

    async execute(churchId: string, id: string): Promise<InventoryItem> {
        const item = await this.itemRepo.findOne({
            where: { id, churchId },
            relations: ['ministry'],
        });
        if (!item) throw new NotFoundException('Ítem de inventario no encontrado');
        return item;
    }
}
