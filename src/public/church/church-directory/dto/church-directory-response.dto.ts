export class PublicChurchDirectoryItemDto {
  id: string; slug: string; name: string; logoUrl: string | null;
  city: string | null; state: string | null; country: string | null;
  address: string | null; latitude: number | null; longitude: number | null;
  isVerified: boolean; publicDescription: string | null;
}

export class PublicChurchDirectoryResponseDto {
  data: PublicChurchDirectoryItemDto[];
  page: number; limit: number; total: number; totalPages: number;
}
