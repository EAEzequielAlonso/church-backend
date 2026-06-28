import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { InvitationType } from '../../entities/invitation.entity';

export class CreateInvitationDto {
  @ApiProperty({ enum: InvitationType, description: 'Tipo de invitación' })
  @IsEnum(InvitationType)
  @IsNotEmpty()
  type: InvitationType;

  @ApiProperty({ example: 'usuario@example.com', description: 'Email de la persona invitada' })
  @IsEmail()
  @IsNotEmpty()
  invitedEmail: string;

  @ApiProperty({ description: 'ID de la iglesia (si aplica al tipo de invitación)', required: false })
  @IsUUID()
  @IsOptional()
  targetChurchId?: string;
}
