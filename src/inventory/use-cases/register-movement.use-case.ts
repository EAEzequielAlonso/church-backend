import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryItem } from '../entities/inventory-item.entity';
import { InventoryMovement } from '../entities/inventory-movement.entity';
import { User } from '../../users/entities/user.entity';
import { RegisterMovementDto } from '../dto/inventory.dto';
import { InventoryMovementType } from '../enums/inventory.enums';
import { InventoryPolicy } from '../policies/inventory.policy';

@Injectable()
export class RegisterMovementUseCase {
    constructor(
        @InjectRepository(InventoryItem)
        private itemRepo: Repository<InventoryItem>,
        @InjectRepository(InventoryMovement)
        private movementRepo: Repository<InventoryMovement>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private dataSource: DataSource,
        private policy: InventoryPolicy,
    ) { }

    async execute(
        churchId: string,
        userId: string,
        roles: string[],
        dto: RegisterMovementDto,
    ): Promise<InventoryMovement> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Usuario no encontrado');

        return this.dataSource.transaction(async (manager) => {
            // Pessimistic lock prevents race conditions on concurrent stock changes
            const item = await manager.findOne(InventoryItem, {
                where: { id: dto.itemId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!item) throw new NotFoundException('Ítem no encontrado');

            // Policy: role check + cross-tenant validation in one place
            this.policy.assertCanRegisterMovement(item, churchId, roles);

            if (dto.type === InventoryMovementType.OUT) {
                if (item.quantity < dto.quantity) {
                    throw new BadRequestException(
                        `Stock insuficiente. Actual: ${item.quantity}, solicitado: ${dto.quantity}`,
                    );
                }
                item.quantity -= dto.quantity;
            } else {
                item.quantity += dto.quantity;
            }

            const movement = manager.create(InventoryMovement, {
                churchId,
                itemId: item.id,
                item,
                type: dto.type,
                quantity: dto.quantity,
                reason: dto.reason,
                observation: dto.observation,
                registeredBy: user,
            });

            await manager.save(movement);
            await manager.save(item);

            return movement;
        });
    }
}
