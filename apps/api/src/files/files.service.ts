import { Injectable } from '@nestjs/common';
import { Client } from 'minio';
import { readSecret } from '../common/secret.util';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class FilesService {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly prisma: PrismaService) {
    const endpoint = process.env.MINIO_ENDPOINT || 'minio:9000';
    const [endPoint, portString] = endpoint.split(':');
    const accessKey = readSecret('MINIO_ACCESS_KEY', { fallback: 'specminio' }) ?? 'specminio';
    const secretKey = readSecret('MINIO_SECRET_KEY', { fallback: 'specminiosecret' }) ?? 'specminiosecret';
    this.client = new Client({
      endPoint,
      port: Number(portString ?? 9000),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey,
      secretKey
    });
    this.bucket = process.env.MINIO_BUCKET || 'uploads';
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'asia');
    }
  }

  async presignUpload(key: string, mimeType: string, expiresInSeconds?: number) {
    await this.ensureBucket();
    const expiry = expiresInSeconds ?? 900;
    const url = await this.client.presignedPutObject(this.bucket, key, expiry, {
      'Content-Type': mimeType
    });
    return { bucket: this.bucket, key, url, expiresInSeconds: expiry };
  }

  async presignDownload(key: string, expiresInSeconds?: number, actorId?: string) {
    await this.ensureBucket();
    const expiry = expiresInSeconds ?? 900;
    const url = await this.client.presignedGetObject(this.bucket, key, expiry);
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'EXPORT_PRESIGNED',
        details: {
          bucket: this.bucket,
          key,
          expiresInSeconds: expiry
        }
      }
    });
    return { bucket: this.bucket, key, url, expiresInSeconds: expiry };
  }
}
