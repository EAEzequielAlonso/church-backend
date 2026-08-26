import { IsEnum, IsIn, IsInt, IsNotEmpty, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum StorageContext {
  AVATARS = 'avatars',
  LOGOS = 'logos',
  COVERS = 'covers',
  MAIN_IMAGES = 'main-images',
  MISSION_REPORTS = 'mission-reports',
}

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export class RequestPresignedUrlDto {
  @ApiProperty({
    description: 'The MIME type of the file to be uploaded',
    enum: ALLOWED_MIME_TYPES,
  })
  @IsNotEmpty()
  @IsIn(ALLOWED_MIME_TYPES, {
    message: `mimeType must be one of the following values: ${ALLOWED_MIME_TYPES.join(', ')}`,
  })
  mimeType: string;

  @ApiProperty({
    description: 'The size of the file in bytes (max 10MB)',
    maximum: MAX_FILE_SIZE_BYTES,
  })
  @IsNotEmpty()
  @IsInt()
  @Max(MAX_FILE_SIZE_BYTES)
  size: number;

  @ApiProperty({
    description: 'The context or entity type this file is for',
    enum: StorageContext,
  })
  @IsNotEmpty()
  @IsEnum(StorageContext)
  context: StorageContext;
}
