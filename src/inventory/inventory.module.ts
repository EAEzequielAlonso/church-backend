import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';
import { Ministry } from '../ministries/entities/ministry.entity';
import { User } from '../users/entities/user.entity';
import { InventoryPolicy } from './policies/inventory.policy';

// Use-cases
import { CreateInventoryItemUseCase } from './use-cases/create-inventory-item.use-case';
import { FindInventoryItemsUseCase } from './use-cases/find-inventory-items.use-case';
import { FindInventoryItemUseCase } from './use-cases/find-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './use-cases/update-inventory-item.use-case';
import { DeactivateInventoryItemUseCase } from './use-cases/deactivate-inventory-item.use-case';
import { DeleteInventoryItemUseCase } from './use-cases/delete-inventory-item.use-case';
import { RegisterMovementUseCase } from './use-cases/register-movement.use-case';
import { GetMovementsUseCase } from './use-cases/get-movements.use-case';

const USE_CASES = [
  CreateInventoryItemUseCase,
  FindInventoryItemsUseCase,
  FindInventoryItemUseCase,
  UpdateInventoryItemUseCase,
  DeactivateInventoryItemUseCase,
  DeleteInventoryItemUseCase,
  RegisterMovementUseCase,
  GetMovementsUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItem,
      InventoryMovement,
      Ministry,
      User,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryPolicy, ...USE_CASES],
})
export class InventoryModule { }
