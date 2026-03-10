import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsDateString, IsDate } from 'class-validator';

export class CreateMinistryTaskDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    assignedToId?: string;

    @ApiPropertyOptional({
    example: '2026-03-07T15:30:00.000Z',
    })
    @IsOptional()
    @IsDate()
    @Type(() => Date)
    dueDate?: Date;

}
