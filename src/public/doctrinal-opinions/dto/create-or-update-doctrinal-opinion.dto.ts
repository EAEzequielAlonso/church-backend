import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DoctrinalOpinionValue } from 'src/public/church/entities/doctrinal-opinion.entity';

export class CreateOrUpdateDoctrinalOpinionDto {
  @IsEnum(DoctrinalOpinionValue)
  @IsNotEmpty()
  opinion: DoctrinalOpinionValue;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
