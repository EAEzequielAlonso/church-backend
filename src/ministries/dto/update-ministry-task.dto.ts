import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateMinistryTaskDto } from './create-ministry-task.dto';

export class UpdateMinistryTaskDto extends PartialType(CreateMinistryTaskDto) {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    observation?: string;
}
