export class SmallGroupMapMarkerDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;

  constructor(partial: Partial<SmallGroupMapMarkerDto>) {
    Object.assign(this, partial);
  }
}
