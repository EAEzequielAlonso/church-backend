export interface JwtPayload {
  sub: string;
  email: string;
  personId: string | null;
  systemRole: string; // added systemRole
  isEmailVerified?: boolean;
  provider?: string;
}
