import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { ResourceType } from '../enums/resource.enums';

export class CreateResourceDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsOptional()
  description?: string;

  @IsEnum(ResourceType) @IsOptional()
  type?: ResourceType;

  @ValidateIf(o => !o.libraryBookId)
  @IsString() @IsNotEmpty({ message: 'URL es obligatorio si no hay libro asociado' })
  url?: string;

  @IsUUID() @IsOptional()
  libraryBookId?: string;

  @IsString() @IsOptional()
  thumbnail?: string;
}

export class UpdateResourceDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(ResourceType) @IsOptional() type?: ResourceType;
  @IsString() @IsOptional() url?: string;
  @IsUUID() @IsOptional() libraryBookId?: string;
  @IsString() @IsOptional() thumbnail?: string;
}
