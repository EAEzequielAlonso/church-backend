import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMinistryDto {
  @ApiProperty({ example: 'Alabanza' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Ministerio de música y adoración' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'uuid-leader' })
  @IsString()
  @IsNotEmpty()
  leaderId: string;

  @ApiProperty({ example: '#3b82f6' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'active' })
  @IsString()
  @IsOptional()
  status?: 'active' | 'inactive';
}
