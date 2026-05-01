export interface JwtPayload {
  sub: string;
  email: string;
  personId: string | null;
  systemRole: string;
  isEmailVerified?: boolean;
  provider?: string;
}
