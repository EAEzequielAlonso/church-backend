import { MissionProjectStatus } from '../enums/missions.enums';

export const MISSION_FINAL_STATES = [
  MissionProjectStatus.COMPLETED,
  MissionProjectStatus.CANCELLED,
];

export const MISSION_PUBLIC_STATES = [
  MissionProjectStatus.ACTIVE,
  MissionProjectStatus.COMPLETED,
];

export const MISSION_EDITABLE_STATES = [
  MissionProjectStatus.DRAFT,
  MissionProjectStatus.ACTIVE,
  MissionProjectStatus.PAUSED,
];

export const MISSION_ALLOWS_NEEDS_STATES = [MissionProjectStatus.ACTIVE];

export const MISSION_ALLOWS_NEED_FULFILLMENT_STATES = [
  MissionProjectStatus.ACTIVE,
];

export const MISSION_ALLOWS_REPORTS_STATES = [MissionProjectStatus.ACTIVE];

export const MISSION_ALLOWS_COLLABORATION_STATES = [
  MissionProjectStatus.ACTIVE,
];
