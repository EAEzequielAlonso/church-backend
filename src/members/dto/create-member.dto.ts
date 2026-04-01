import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { EcclesiasticalRole, FunctionalRole } from '../../common/enums';
import { MembershipStatus } from '../enums/membership-status.enum';

export class CreateMemberDto {
  @ApiProperty({ example: 'john@example.com', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;



  @ApiProperty({
    enum: MembershipStatus,
    required: false,
    default: MembershipStatus.MEMBER,
  })
  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;

  @ApiProperty({ enum: EcclesiasticalRole, default: EcclesiasticalRole.NONE })
  @IsEnum(EcclesiasticalRole)
  @IsOptional()
  ecclesiasticalRole?: EcclesiasticalRole;

  @ApiProperty({
    enum: FunctionalRole,
    isArray: true,
    default: [FunctionalRole.MEMBER],
  })
  @IsEnum(FunctionalRole, { each: true })
  @IsOptional()
  @IsArray()
  functionalRoles?: FunctionalRole[];

  @ApiProperty({ example: '12345678', required: false })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiProperty({ example: '+54 11 1234 5678', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: '1990-01-01', required: false })
  @IsString()
  @IsOptional()
  birthDate?: string;
}
