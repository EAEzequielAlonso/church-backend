import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Ministry } from '../../ministries/entities/ministry.entity';
import { UpdateInventoryItemDto } from '../dto/inventory.dto';
import { InventoryPolicy } from '../policies/inventory.policy';

@Injectable()
export class UpdateInventoryItemUseCase {
    constructor(
        @InjectRepository(InventoryItem)
        private itemRepo: Repository<InventoryItem>,
        @InjectRepository(Ministry)
        private ministryRepo: Repository<Ministry>,
        private policy: InventoryPolicy,
    ) { }

    async execute(
        churchId: string,
        id: string,
        roles: string[],
        dto: UpdateInventoryItemDto,
    ): Promise<InventoryItem> {
        this.policy.assertCanUpdateItem(roles);

        const item = await this.itemRepo.findOne({ where: { id, churchId } });
        if (!item) throw new NotFoundException('Ítem de inventario no encontrado');

        if (dto.ministryId !== undefined) {
            if (dto.ministryId) {
                const ministry = await this.ministryRepo.findOne({
                    where: { id: dto.ministryId, churchId: churchId },
                    relations: ['church'],
                });
                if (!ministry) throw new NotFoundException('Ministerio no encontrado en esta iglesia');
                item.ministryId = ministry.id;
                item.ministry = ministry;
            } else {
                item.ministryId = null;
                item.ministry = null;
            }
        }

        const { ministryId, ...rest } = dto;
        Object.assign(item, rest);
        return this.itemRepo.save(item);
    }
}
