import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryPolicy } from '../policies/inventory.policy';

@Injectable()
export class DeactivateInventoryItemUseCase {
    constructor(
        @InjectRepository(InventoryItem)
        private itemRepo: Repository<InventoryItem>,
        private policy: InventoryPolicy,
    ) { }

    async execute(churchId: string, id: string, roles: string[]): Promise<InventoryItem> {
        this.policy.assertCanDeactivateItem(roles);

        const item = await this.itemRepo.findOne({ where: { id, churchId } });
        if (!item) throw new NotFoundException('Ítem de inventario no encontrado');

        item.status = 'inactive';
        return this.itemRepo.save(item);
    }
}
