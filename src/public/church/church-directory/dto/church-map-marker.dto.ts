export class ChurchMapMarkerDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;
  isVerified: boolean;

  constructor(partial: Partial<ChurchMapMarkerDto>) {
    Object.assign(this, partial);
  }
}
