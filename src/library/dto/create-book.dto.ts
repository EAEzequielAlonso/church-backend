import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { BookOwnershipType } from '../../common/enums/library.enums';

export class CreateBookDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    author: string;

    @IsUUID()
    @IsNotEmpty()
    categoryId: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    isbn?: string;

    @IsString()
    @IsOptional()
    coverUrl?: string;

    @IsEnum(BookOwnershipType)
    @IsOptional()
    ownershipType?: BookOwnershipType; // Defaults to CHURCH if not active member? Or logic in controller.

    @IsBoolean()
    @IsOptional()
    isChurchOwned?: boolean; // Logic in UseCase to set strict

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    condition?: string;

    @IsString()
    @IsOptional()
    location?: string;
}

export class UpdateBookDto extends CreateBookDto { }
