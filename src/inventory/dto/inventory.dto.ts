import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import {
  InventoryItemCategory,
  InventoryMovementType,
  InventoryInReason,
  InventoryOutReason,
} from '../enums/inventory.enums';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(InventoryItemCategory)
  category: InventoryItemCategory;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  initialQuantity?: number; // Opcional, si > 0 crea un movimiento inicial

  @IsUUID()
  @IsOptional()
  ministryId?: string;
}

export class CreateInventoryMovementDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string; // Validar contra InReason o OutReason en servicio

  @IsString()
  @IsOptional()
  observation?: string;
}

export class UpdateInventoryItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(InventoryItemCategory)
  @IsOptional()
  category?: InventoryItemCategory;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUUID()
  @IsOptional()
  ministryId?: string;
}
