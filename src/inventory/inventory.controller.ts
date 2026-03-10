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
  Request,
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
import { CurrentChurch } from '../common/decorators';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreateInventoryItemUseCase } from './use-cases/create-inventory-item.use-case';
import { FindInventoryItemsUseCase } from './use-cases/find-inventory-items.use-case';
import { FindInventoryItemUseCase } from './use-cases/find-inventory-item.use-case';
import { UpdateInventoryItemUseCase } from './use-cases/update-inventory-item.use-case';
import { DeactivateInventoryItemUseCase } from './use-cases/deactivate-inventory-item.use-case';
import { DeleteInventoryItemUseCase } from './use-cases/delete-inventory-item.use-case';
import { RegisterMovementUseCase } from './use-cases/register-movement.use-case';
import { GetMovementsUseCase } from './use-cases/get-movements.use-case';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard)
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
  ) { }

  // ─── READ (any authenticated user) ─────────────────────────────────────────

  @Get()
  findAll(
    @CurrentChurch() churchId: string,
    @Query('ministryId') ministryId?: string,
    @Query('category') category?: string,
  ) {
    return this.findItemsUseCase.execute(churchId, { ministryId, category });
  }

  @Get('movements')
  getMovements(
    @CurrentChurch() churchId: string,
    @Query('itemId') itemId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.getMovementsUseCase.execute(churchId, { itemId, page, limit });
  }

  @Get(':id')
  findOne(
    @CurrentChurch() churchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.findItemUseCase.execute(churchId, id);
  }

  // ─── WRITE (policy enforced inside use-case) ───────────────────────────────

  @Post()
  create(
    @CurrentChurch() churchId: string,
    @Request() req,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.createItemUseCase.execute(churchId, req.user.id, req.user.roles ?? [], dto);
  }

  @Patch(':id')
  update(
    @CurrentChurch() churchId: string,
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.updateItemUseCase.execute(churchId, id, req.user.roles ?? [], dto);
  }

  @Post('movement')
  registerMovement(
    @CurrentChurch() churchId: string,
    @Request() req,
    @Body() dto: RegisterMovementDto,
  ) {
    return this.registerMovementUseCase.execute(churchId, req.user.id, req.user.roles ?? [], dto);
  }

  @Patch(':id/deactivate')
  deactivate(
    @CurrentChurch() churchId: string,
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deactivateItemUseCase.execute(churchId, id, req.user.roles ?? []);
  }

  @Delete(':id')
  delete(
    @CurrentChurch() churchId: string,
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deleteItemUseCase.execute(churchId, id, req.user.roles ?? []);
  }
}
