import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ServiceDutyBehavior } from '../enums/service-duty-behavior.enum';

export class CreateServiceDutyDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ enum: ServiceDutyBehavior })
    @IsEnum(ServiceDutyBehavior)
    @IsOptional()
    behaviorType?: ServiceDutyBehavior;
}
