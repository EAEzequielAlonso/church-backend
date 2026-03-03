import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FamilyRole } from '../../common/enums';
import { CreateMemberDto } from '../../members/dto/create-member.dto'; // We might need a partial or simplified version, but let's reuse/adapt

export class FamilyMemberDto {
  @IsEnum(FamilyRole)
  role: FamilyRole;

  @IsOptional()
  @IsString()
  memberId?: string; // If linking an existing member

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateMemberDto)
  newMember?: CreateMemberDto; // If creating a new member (e.g. child)
}

export class CreateFamilyDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FamilyMemberDto)
  members: FamilyMemberDto[];
}
