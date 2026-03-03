import { IsEmail, IsString, IsOptional } from 'class-validator';

export class SocialLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  sub?: string;

  @IsString()
  @IsOptional()
  picture?: string;
}
