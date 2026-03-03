export interface JwtPayload {
  sub: string;
  email: string;
  personId: string;
  churchId?: string; // Active context
  memberId?: string;
  ecclesiasticalRole?: string;
  roles?: string[]; // Active roles in that context
}
