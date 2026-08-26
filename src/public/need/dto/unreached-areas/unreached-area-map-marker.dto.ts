import { IsNumber, IsString } from 'class-validator';

export class UnreachedAreaMapMarkerDto {
  @IsString()
  id: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

  @IsString()
  title: string;
}
