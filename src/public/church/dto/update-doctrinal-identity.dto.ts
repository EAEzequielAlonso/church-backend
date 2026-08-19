import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import {
  ChurchGovernment,
  BaptismStance,
  SpiritualGiftsStance,
  EschatologyStance,
  GenderRolesStance,
  LordsSupperStance,
} from '../../enums/public.enums';

export class UpdateDoctrinalIdentityDto {
  @IsOptional() @IsBoolean() affirmsScriptureAuthority?: boolean;
  @IsOptional() @IsBoolean() affirmsTrinity?: boolean;
  @IsOptional() @IsBoolean() affirmsDeityOfChrist?: boolean;
  @IsOptional() @IsBoolean() affirmsHumanityOfChrist?: boolean;
  @IsOptional() @IsBoolean() affirmsSalvationByGrace?: boolean;
  @IsOptional() @IsBoolean() affirmsBodilyResurrection?: boolean;
  @IsOptional() @IsBoolean() affirmsSecondComing?: boolean;

  @IsOptional()
  @IsEnum(ChurchGovernment)
  churchGovernment?: ChurchGovernment | null;
  @IsOptional() @IsEnum(BaptismStance) baptismStance?: BaptismStance | null;
  @IsOptional()
  @IsEnum(SpiritualGiftsStance)
  spiritualGiftsStance?: SpiritualGiftsStance | null;
  @IsOptional()
  @IsEnum(EschatologyStance)
  eschatologyStance?: EschatologyStance | null;
  @IsOptional()
  @IsEnum(GenderRolesStance)
  genderRolesStance?: GenderRolesStance | null;
  @IsOptional()
  @IsEnum(LordsSupperStance)
  lordsSupperStance?: LordsSupperStance | null;
}
