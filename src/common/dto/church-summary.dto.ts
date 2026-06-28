export class ChurchSummaryDto {
  id: string;
  name: string;
  slug: string | null;
  avatarUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isCurrentAdmin?: boolean;
}
