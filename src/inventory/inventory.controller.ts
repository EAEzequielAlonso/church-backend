import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  CreateInventoryMovementDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  create(@Body() createDto: CreateInventoryItemDto, @Request() req) {
    return this.inventoryService.createItem(createDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req, @Query() filters: any) {
    return this.inventoryService.findAll(req.user.userId, filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateInventoryItemDto) {
    return this.inventoryService.updateItem(id, updateDto);
  }

  @Post('movements')
  registerMovement(@Body() dto: CreateInventoryMovementDto, @Request() req) {
    return this.inventoryService.registerMovement(dto, req.user.userId);
  }
}
