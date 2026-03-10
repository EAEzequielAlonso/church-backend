import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMinistryEventDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    location?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    type?: string;
}
