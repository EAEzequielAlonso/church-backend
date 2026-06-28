import { MaritalStatus, Sex } from "../enums/person.enum";


export class PersonProfileDto {
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  birthDate: string | null;
  sex: Sex | null;
  maritalStatus: MaritalStatus | null;
  nationality: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null; 
  slug: string | null;
  isPublicProfileEnabled: boolean;
  email: string;                  
  avatarUrl: string | null;       
}
