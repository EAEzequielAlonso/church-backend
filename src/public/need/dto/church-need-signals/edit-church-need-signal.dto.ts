import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class EditChurchNeedSignalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observation: string;
}
