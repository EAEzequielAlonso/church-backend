import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrUpdateMeetingNoteDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    content?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    attendanceInfo?: string;
}
