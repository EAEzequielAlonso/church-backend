import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class RegisterChurchDto {
  @IsString()
  @IsNotEmpty()
  churchName: string;

  @IsString()
  @IsOptional()
  churchSlug?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  churchSlug?: string;
}

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  inviteToken?: string;
}
