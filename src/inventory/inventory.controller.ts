import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  RegisterMovementDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AppPermission } from '../auth/authorization/permissions.enum';
import { CurrentChurch, CurrentUser } from '../common/decorators';
import { SecurityContext } from '../auth/security-context.interface';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateInventoryItemUseCase } from './use-cases/create-inventory-item.use-case';
import { FindInventoryItemsUseCase } from './use-cases/find-inventory-items.use-case';
import { FindInventoryItemUseCase } from './use-cases/find-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './use-cases/update-inventory-item.use-case';
import { DeactivateInventoryItemUseCase } from './use-cases/deactivate-inventory-item.use-case';
import { DeleteInventoryItemUseCase } from './use-cases/delete-inventory-item.use-case';
import { RegisterMovementUseCase } from './use-cases/register-movement.use-case';
import { GetMovementsUseCase } from './use-cases/get-movements.use-case';

import { SubscriptionGuard } from '../subscriptions/guards/subscription.guard';
@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, SecurityContextGuard, PermissionsGuard, SubscriptionGuard)
export class InventoryController {
  constructor(
    private readonly createItemUseCase: CreateInventoryItemUseCase,
    private readonly findItemsUseCase: FindInventoryItemsUseCase,
    private readonly findItemUseCase: FindInventoryItemUseCase,
    private readonly updateItemUseCase: UpdateInventoryItemUseCase,
    private readonly deactivateItemUseCase: DeactivateInventoryItemUseCase,
    private readonly deleteItemUseCase: DeleteInventoryItemUseCase,
    private readonly registerMovementUseCase: RegisterMovementUseCase,
    private readonly getMovementsUseCase: GetMovementsUseCase,
  ) {}

  // ─── READ (any authenticated user) ─────────────────────────────────────────

  @Get()
  @RequirePermissions(AppPermission.INVENTORY_VIEW)
  findAll(
    @CurrentChurch() churchId: string,
    @Query('ministryId') ministryId?: string,
    @Query('category') category?: string,
  ) {
    return this.findItemsUseCase.execute(churchId, { ministryId, category });
  }

  @Get('movements')
  @RequirePermissions(AppPermission.INVENTORY_VIEW)
  getMovements(
    @CurrentChurch() churchId: string,
    @Query('itemId') itemId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.getMovementsUseCase.execute(churchId, { itemId, page, limit });
  }

  @Get(':id')
  @RequirePermissions(AppPermission.INVENTORY_VIEW)
  findOne(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.findItemUseCase.execute(churchId, id);
  }

  // ─── WRITE (policy enforced inside use-case) ───────────────────────────────

  @Post()
  @RequirePermissions(AppPermission.INVENTORY_MANAGE)
  create(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.createItemUseCase.execute(
      churchId,
      securityContext.userId,
      securityContext.functionalRoles ?? [],
      dto,
    );
  }

  @Patch(':id')
  @RequirePermissions(AppPermission.INVENTORY_MANAGE)
  update(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.updateItemUseCase.execute(
      churchId,
      id,
      securityContext.functionalRoles ?? [],
      dto,
    );
  }

  @Post('movement')
  @RequirePermissions(AppPermission.INVENTORY_MANAGE)
  registerMovement(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Body() dto: RegisterMovementDto,
  ) {
    return this.registerMovementUseCase.execute(
      churchId,
      securityContext.userId,
      securityContext.functionalRoles ?? [],
      dto,
    );
  }

  @Patch(':id/deactivate')
  @RequirePermissions(AppPermission.INVENTORY_MANAGE)
  deactivate(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deactivateItemUseCase.execute(
      churchId,
      id,
      securityContext.functionalRoles ?? [],
    );
  }

  @Delete(':id')
  @RequirePermissions(AppPermission.INVENTORY_MANAGE)
  delete(
    @CurrentChurch() churchId: string,
    @CurrentUser() securityContext: SecurityContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deleteItemUseCase.execute(churchId, id, securityContext.functionalRoles ?? []);
  }
}
