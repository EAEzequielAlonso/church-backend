import { IsEnum, IsNotEmpty } from 'class-validator';
import { NeedSignalStatus } from 'src/public/enums/public.enums';

export class UpdateChurchNeedSignalStatusDto {
  @IsEnum(NeedSignalStatus)
  @IsNotEmpty()
  status: NeedSignalStatus;
}
