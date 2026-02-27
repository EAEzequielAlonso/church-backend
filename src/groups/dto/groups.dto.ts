import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroupType, GroupVisibility } from '../enums/group.enums';

export class CreateGroupDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    objective?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    schedule?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    hasStudyMaterial?: boolean;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    studyMaterial?: string;

    @ApiProperty({ enum: GroupType })
    @IsEnum(GroupType)
    @IsOptional()
    type?: GroupType;

    @ApiProperty({ enum: GroupVisibility })
    @IsEnum(GroupVisibility)
    @IsOptional()
    visibility?: GroupVisibility;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    leaderChurchPersonId?: string; // Optional during creation to auto-assign a leader
}

export class UpdateGroupDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    objective?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    schedule?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    hasStudyMaterial?: boolean;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    studyMaterial?: string;

    @ApiPropertyOptional({ enum: GroupType })
    @IsEnum(GroupType)
    @IsOptional()
    type?: GroupType;

    @ApiPropertyOptional({ enum: GroupVisibility })
    @IsEnum(GroupVisibility)
    @IsOptional()
    visibility?: GroupVisibility;
}
