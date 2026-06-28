import { SystemRole } from '../../../common/enums';

export class SessionUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  systemRole: SystemRole;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  hasLocation: boolean;
  provider: string;
}
