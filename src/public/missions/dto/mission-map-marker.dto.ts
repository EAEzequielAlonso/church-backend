export class MissionMapMarkerDto {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string;

  constructor(partial: Partial<MissionMapMarkerDto>) {
    Object.assign(this, partial);
  }
}
