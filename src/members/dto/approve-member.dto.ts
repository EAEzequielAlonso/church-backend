import { IsEnum, IsArray, IsNotEmpty } from 'class-validator';
import { MembershipStatus } from '../enums/membership-status.enum';
import { EcclesiasticalRole, FunctionalRole } from '../../common/enums';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveMemberDto {
  @ApiProperty({ enum: MembershipStatus })
  @IsEnum(MembershipStatus)
  @IsNotEmpty()
  membershipStatus: MembershipStatus;

  @ApiProperty({ enum: EcclesiasticalRole })
  @IsEnum(EcclesiasticalRole)
  @IsNotEmpty()
  ecclesiasticalRole: EcclesiasticalRole;

  @ApiProperty({ enum: FunctionalRole, isArray: true })
  @IsArray()
  @IsEnum(FunctionalRole, { each: true })
  @IsNotEmpty()
  functionalRoles: FunctionalRole[];
}
