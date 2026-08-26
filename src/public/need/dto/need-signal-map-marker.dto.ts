export class NeedSignalMapMarkerDto {
  id: string;
  needLocationId: string;
  latitude: number;
  longitude: number;
  status: string;

  constructor(partial: Partial<NeedSignalMapMarkerDto>) {
    Object.assign(this, partial);
  }
}
