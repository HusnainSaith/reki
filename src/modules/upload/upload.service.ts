import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

@Injectable()
export class UploadService {
  private s3: S3Client | null;
  private bucket: string;
  private region: string;
  private maxFileSizeBytes: number;
  private isConfigured: boolean;

  constructor(private configService: ConfigService) {
    this.region = this.configService.get<string>('app.s3.region');
    this.bucket = this.configService.get<string>('app.s3.bucket');
    const maxMb = this.configService.get<number>('app.s3.maxFileSizeMb') || 5;
    this.maxFileSizeBytes = maxMb * 1024 * 1024;

    const accessKeyId = this.configService.get<string>('app.s3.accessKeyId');
    const secretAccessKey = this.configService.get<string>('app.s3.secretAccessKey');
    this.isConfigured = !!(accessKeyId && secretAccessKey && this.bucket);

    if (this.isConfigured) {
      this.s3 = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
    } else {
      this.s3 = null;
    }
  }

  async uploadImage(file: Express.Multer.File, folder = 'images'): Promise<{ url: string; key: string }> {
    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${randomUUID()}${ext}`;

    if (!this.isConfigured) {
      // Dev stub — S3 not configured, return a placeholder URL
      return { url: `https://placeholder.reki.dev/${key}`, key };
    }

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: 'max-age=31536000',
        }),
      );
    } catch {
      throw new InternalServerErrorException('Failed to upload image to S3');
    }

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { url, key };
  }

  async deleteImage(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch {
      throw new InternalServerErrorException('Failed to delete image from S3');
    }
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    if (file.size > this.maxFileSizeBytes) {
      const maxMb = this.maxFileSizeBytes / (1024 * 1024);
      throw new BadRequestException(`File too large. Maximum size is ${maxMb}MB`);
    }
  }
}
