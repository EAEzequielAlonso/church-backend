import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

export class MinistryAssignmentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    roleId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    personId: string;

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    date: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    serviceType?: string;

    @ApiPropertyOptional()
    @IsOptional()
    metadata?: any;
}

export class CreateMinistryAssignmentsDto {
    @ApiProperty({ type: [MinistryAssignmentDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MinistryAssignmentDto)
    assignments: MinistryAssignmentDto[];
}
