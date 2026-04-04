import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateOrUpdateMeetingNoteDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    decisions?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    nextSteps?: string;
}
