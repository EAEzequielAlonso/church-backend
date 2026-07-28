export class ChurchRelationDto {
  churchId: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  city?: string;
  country?: string;
}

export interface VisibleContributionsDto {
  churchesAdded: number;
  doctrinalOpinions: number;
  needSignalsCreated: number;
  unreachedAreasCreated: number;
  needInformationAdded: number;
  invitationsCompleted: number;
}

export class PublicPersonProfileDto {
  slug: string;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  city: string | null;
  country: string | null;
  createdAt: Date;

  memberChurch: ChurchRelationDto | null;
  visitorChurch: ChurchRelationDto | null;
  followedChurches: ChurchRelationDto[];

  contributionsCount: number;
  visibleContributions: VisibleContributionsDto;
}
