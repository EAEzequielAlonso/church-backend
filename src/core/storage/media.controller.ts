import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { RequestPresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SecurityContextGuard } from '../auth/guards/security-context.guard';

@ApiTags('Media')
@ApiBearerAuth()
@Controller('media')
export class MediaController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard, SecurityContextGuard)
  @Post('presigned-url')
  @ApiOperation({ summary: 'Request a presigned URL to upload a file directly to storage' })
  async requestPresignedUrl(@Body() dto: RequestPresignedUrlDto) {
    return this.storageService.generatePresignedUrl(
      dto.context,
      dto.mimeType,
      dto.size,
    );
  }
}
