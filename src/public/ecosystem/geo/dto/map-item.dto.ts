export class ChurchMapItemDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  isCurrentAdmin: boolean;
  verified: boolean;
  type: 'CHURCH' = 'CHURCH';
}

export class MissionMapItemDto {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  status: string;
  collaborationCount: number;
  needCount: number;
  type: 'MISSION' = 'MISSION';
}

export class SmallGroupMapItemDto {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  status: string;
  capacityStatus: string;
  type: 'SMALL_GROUP' = 'SMALL_GROUP';
}

export class NeedSignalMapItemDto {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  status: string;
  hasSupport: boolean;
  supportCount: number;
  type: 'NEED_SIGNAL' = 'NEED_SIGNAL';
}

export class ChurchNeedSignalMapItemDto {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  status: string;
  type: 'CHURCH_NEED_SIGNAL' = 'CHURCH_NEED_SIGNAL';
}

export class UnreachedAreaMapItemDto {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  status: string;
  type: 'UNREACHED_AREA' = 'UNREACHED_AREA';
}
