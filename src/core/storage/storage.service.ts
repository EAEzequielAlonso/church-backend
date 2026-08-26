import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('r2.accountId');
    const accessKeyId = this.configService.get<string>('r2.accessKeyId');
    const secretAccessKey = this.configService.get<string>('r2.secretAccessKey');
    
    this.bucketName = this.configService.get<string>('r2.bucketName');
    this.publicUrl = this.configService.get<string>('r2.publicUrl');

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mapping: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return mapping[mimeType] || 'bin';
  }

  extractKeyFromUrl(url: string, context: string): string | null {
    if (!url) return null;
    
    const baseUrl = this.publicUrl.endsWith('/') ? this.publicUrl : `${this.publicUrl}/`;
    
    if (url.startsWith(baseUrl)) {
      const key = url.substring(baseUrl.length);
      // Validate that the key belongs to the expected context to prevent arbitrary deletions
      if (key.startsWith(`${context}/`)) {
        return key;
      }
    }
    
    return null;
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('Storage client is not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      // Re-throw to let the caller handle it (e.g., swallow or log)
      throw error;
    }
  }

  async generatePresignedUrl(
    context: string,
    mimeType: string,
    size: number,
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('Storage client is not configured');
    }

    const uuid = crypto.randomUUID();
    const extension = this.getExtensionFromMimeType(mimeType);
    const key = `${context}/${uuid}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
    });

    // URL expires in 5 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 300,
    });

    // Ensure the public URL does not have a trailing slash before appending the key
    let baseUrl = this.publicUrl.endsWith('/') ? this.publicUrl.slice(0, -1) : this.publicUrl;
    if (baseUrl && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    const publicUrl = `${baseUrl}/${key}`;

    return {
      uploadUrl,
      publicUrl,
      key,
    };
  }
}
