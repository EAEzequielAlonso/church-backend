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
  InventoryReason,
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
  initialQuantity?: number;

  @IsUUID()
  @IsOptional()
  ministryId?: string;
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

export class RegisterMovementDto {
  @IsUUID()
  @IsNotEmpty()
  itemId: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsEnum(InventoryReason)
  reason: InventoryReason;

  @IsString()
  @IsOptional()
  observation?: string;
}
