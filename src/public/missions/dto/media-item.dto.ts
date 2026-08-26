import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class MediaItemDto {
  @IsString()
  url: string;

  @IsInt()
  order: number;

  @IsString()
  @IsOptional()
  observation?: string;
}
