export class PublicRelationResponseDto {
  id: string;
  churchId: string | null;
  relationType: string;
  status: string;
  note: string | null;

  createdAt: Date;
  churchName?: string;
  churchSlug?: string;
  coverUrl?: string;
}
