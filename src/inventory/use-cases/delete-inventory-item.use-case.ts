import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { InventoryPolicy } from '../policies/inventory.policy';

@Injectable()
export class DeleteInventoryItemUseCase {
    constructor(
        @InjectRepository(InventoryItem)
        private itemRepo: Repository<InventoryItem>,
        @InjectRepository(InventoryMovement)
        private movementRepo: Repository<InventoryMovement>,
        private policy: InventoryPolicy,
    ) { }

    async execute(churchId: string, id: string, roles: string[]): Promise<void> {
        this.policy.assertCanDeleteItem(roles);

        const item = await this.itemRepo.findOne({ where: { id, churchId } });
        if (!item) throw new NotFoundException('Ítem de inventario no encontrado');

        // Delete movements first to avoid FK constraint violations
        await this.movementRepo.delete({ itemId: id });
        await this.itemRepo.remove(item);
    }
}
