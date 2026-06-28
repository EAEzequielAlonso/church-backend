import { Person } from '../entities/person.entity';
import { Sex, MaritalStatus } from '../enums/person.enum';

export class UserProfileResponseDto {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  birthDate: Date;
  sex: Sex;
  maritalStatus: MaritalStatus;
  nationality: string;
  country: string;
  state: string;
  city: string;
  neighborhood: string;
  postalCode: string;
  occupation: string;
  slug: string;
  isPublicProfileEnabled: boolean;
  email: string;
  avatarUrl: string;

  static fromPerson(p: Person): UserProfileResponseDto {
    return {
      firstName: p.firstName,
      lastName: p.lastName,
      phoneNumber: p.phoneNumber,
      birthDate: p.birthDate,
      sex: p.sex,
      maritalStatus: p.maritalStatus,
      nationality: p.nationality,
      country: p.country,
      state: p.state,
      city: p.city,
      neighborhood: p.neighborhood,
      postalCode: p.postalCode,
      occupation: p.occupation,
      slug: p.slug,
      isPublicProfileEnabled: p.isPublicProfileEnabled,
      email: p.email,
      avatarUrl: p.avatarUrl,
    };
  }
}
