import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SocialLoginDto {
  @ApiProperty({
    example: 'usuario@gmail.com',
    description: 'Email de la cuenta social',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'google-oauth2|123456',
    description: 'Identificador del proveedor (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  sub?: string;

  @ApiProperty({
    example: 'https://example.com/foto.jpg',
    description: 'URL de la foto de perfil (opcional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  picture?: string;
}
