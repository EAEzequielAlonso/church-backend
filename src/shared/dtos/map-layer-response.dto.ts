export class MapLayerResponseDto<T> {
  markers: T[];
  hasMore: boolean;

  constructor(markers: T[], hasMore: boolean) {
    this.markers = markers;
    this.hasMore = hasMore;
  }
}
