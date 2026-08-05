export class AdminPendingClaimDto {
  id: string;
  status: string;
  createdAt: Date;
  evidence: string | null;

  church: {
    id: string;
    name: string;
    slug: string | null;
    logoUrl: string | null;
  };

  claimant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
}
