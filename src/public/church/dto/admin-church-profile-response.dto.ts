import {
  ChurchDenomination,
  DayOfWeek,
  ChurchGovernment,
  BaptismStance,
  SpiritualGiftsStance,
  EschatologyStance,
  GenderRolesStance,
  LordsSupperStance,
} from '../../enums/public.enums';
import { GeoPrecision } from '../../ecosystem/enums/ecosystem.enums';

export class AdminChurchMeetingDto {
  id: string;
  dayOfWeek: DayOfWeek;
  title: string;
  startTime: string; // HH:mm
}

export class AdminChurchDoctrinalDto {
  affirmsScriptureAuthority: boolean;
  affirmsTrinity: boolean;
  affirmsDeityOfChrist: boolean;
  affirmsHumanityOfChrist: boolean;
  affirmsSalvationByGrace: boolean;
  affirmsBodilyResurrection: boolean;
  affirmsSecondComing: boolean;

  churchGovernment: ChurchGovernment | null;
  baptismStance: BaptismStance | null;
  spiritualGiftsStance: SpiritualGiftsStance | null;
  eschatologyStance: EschatologyStance | null;
  genderRolesStance: GenderRolesStance | null;
  lordsSupperStance: LordsSupperStance | null;
}

export class AdminChurchProfileResponseDto {
  churchId: string;
  slug: string | null;
  isVerified: boolean;
  publicDescription: string | null;
  denomination: ChurchDenomination | null;
  
  logoUrl: string | null;
  coverUrl: string | null;
  mainImageUrl: string | null;
  photoUrls: string[];


  contact: {
    contactEmail: string | null;
    contactPhone: string | null;
  };
  socialLinks: {
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    youtube: string | null;
  };
  location: {
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    geoPrecision: GeoPrecision;
  };
  schedules: AdminChurchMeetingDto[];
  doctrinalIdentity: AdminChurchDoctrinalDto | null;
}
