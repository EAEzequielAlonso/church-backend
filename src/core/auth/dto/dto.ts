import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterChurchDto {
  @ApiProperty({
    example: 'Iglesia Central',
    description: 'Nombre de la iglesia',
  })
  @IsString()
  @IsNotEmpty()
  churchName: string;

  @ApiProperty({
    example: 'iglesia-central',
    description: 'Slug único para la URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  churchSlug?: string;

  @ApiProperty({
    example: 'pastor@example.com',
    description: 'Email del fundador/administrador',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo',
  })
  password: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre del fundador' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del fundador' })
  @IsString()
  lastName: string;
}

export class LoginDto {
  @ApiProperty({
    example: 'usuario@example.com',
    description: 'Email del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña del usuario',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: 'iglesia-central',
    description: 'Slug de la iglesia (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  churchSlug?: string;
}

export class RegisterUserDto {
  @ApiProperty({
    example: 'nuevo@example.com',
    description: 'Email del nuevo usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo',
  })
  password: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Confirmación de la contraseña',
    required: false,
  })
  @IsString()
  @IsOptional()
  confirmPassword?: string;

  @ApiProperty({
    example: 'Pedro',
    description: 'Nombre (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({
    example: 'García',
    description: 'Apellido (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    description: 'Token de invitación (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  inviteToken?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'usuario@example.com',
    description: 'Email del usuario',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token seguro recibido por correo' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'Password123!',
    description:
      'Nueva contraseña (mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo',
  })
  newPassword: string;
}
