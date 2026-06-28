import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ViewportQueryDto {
  @Type(() => Number)
  @IsNumber()
  northEastLat: number;

  @Type(() => Number)
  @IsNumber()
  northEastLng: number;

  @Type(() => Number)
  @IsNumber()
  southWestLat: number;

  @Type(() => Number)
  @IsNumber()
  southWestLng: number;
}
