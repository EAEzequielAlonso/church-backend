import { ApiProperty } from '@nestjs/swagger';

export class UserWorkspaceDto {
  @ApiProperty()
  churchId: string;

  @ApiProperty()
  churchSlug: string;

  @ApiProperty()
  churchName: string;

  @ApiProperty()
  isAdmin: boolean;
}
