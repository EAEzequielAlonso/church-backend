import { IsEnum, IsNotEmpty } from 'class-validator';
import { UnreachedAreaStatus } from '../../enums/need-signals.enum';

export class UpdateUnreachedAreaStatusDto {
  @IsEnum(UnreachedAreaStatus)
  @IsNotEmpty()
  status: UnreachedAreaStatus;
}
