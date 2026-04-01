import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { User } from '../../users/entities/user.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { CreateInventoryItemDto } from '../dto/inventory.dto';
import { InventoryMovementType, InventoryReason } from '../enums/inventory.enums';
import { InventoryPolicy } from '../policies/inventory.policy';

@Injectable()
export class CreateInventoryItemUseCase {
    constructor(
        @InjectRepository(InventoryItem)
        private itemRepo: Repository<InventoryItem>,
        @InjectRepository(InventoryMovement)
        private movementRepo: Repository<InventoryMovement>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Ministry)
        private ministryRepo: Repository<Ministry>,
        private dataSource: DataSource,
        private policy: InventoryPolicy,
    ) { }

    async execute(
        churchId: string,
        userId: string,
        roles: string[],
        dto: CreateInventoryItemDto,
    ): Promise<InventoryItem> {
        this.policy.assertCanCreateItem(roles);

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        let ministry: Ministry | null = null;
        if (dto.ministryId) {
            ministry = await this.ministryRepo.findOne({
                where: { id: dto.ministryId, churchId: churchId },
                relations: ['church'],
            });
            if (!ministry) throw new NotFoundException('Ministerio no encontrado en esta iglesia');
        }

        return this.dataSource.transaction(async (manager) => {
            const item = manager.create(InventoryItem, {
                churchId,
                name: dto.name,
                category: dto.category,
                description: dto.description,
                imageUrl: dto.imageUrl,
                location: dto.location,
                ministryId: ministry?.id ?? null,
                ministry,
                quantity: 0,
                status: 'active',
            });
            const savedItem = await manager.save(item);

            if (dto.initialQuantity && dto.initialQuantity > 0) {
                const movement = manager.create(InventoryMovement, {
                    churchId,
                    itemId: savedItem.id,
                    item: savedItem,
                    type: InventoryMovementType.IN,
                    quantity: dto.initialQuantity,
                    reason: InventoryReason.ADJUSTMENT,
                    observation: 'Inventario inicial',
                    registeredBy: user,
                });
                await manager.save(movement);

                savedItem.quantity = dto.initialQuantity;
                await manager.save(savedItem);
            }

            return savedItem;
        });
    }
}
