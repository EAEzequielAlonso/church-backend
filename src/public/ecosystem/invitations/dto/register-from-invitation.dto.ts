import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { RegisterUserDto } from '../../../../core/auth/dto/dto';

export class RegisterFromInvitationDto extends RegisterUserDto {
  @ApiProperty({
    description: 'Token de invitación obligatorio para este flujo',
  })
  @IsString()
  @IsNotEmpty()
  inviteToken: string;
}
