/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService implements OnModuleInit {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName =
      this.configService.get<string>('AWS_BUCKET_NAME') || 'avatars';

    // Khởi tạo S3 Client (Cấu hình để trỏ về MinIO)
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      endpoint: this.configService.get<string>('AWS_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        )!,
      },
      forcePathStyle: true, // Bắt buộc dùng path style để tương thích với MinIO
    });
  }

  async onModuleInit() {
    this.logger.log('Initializing MinIO Storage...');
    await this.ensureBucketExists();
  }

  /**
   * Kiểm tra và tự tạo Bucket + Set Policy nếu chưa có
   */
  private async ensureBucketExists() {
    try {
      // 1. Kiểm tra bucket tồn tại chưa
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`Bucket "${this.bucketName}" already exists.`);
    } catch {
      // Nếu lỗi là NotFound (404) thì tạo mới
      this.logger.warn(`Bucket "${this.bucketName}" not found. Creating...`);

      try {
        // 2. Tạo Bucket
        await this.s3Client.send(
          new CreateBucketCommand({ Bucket: this.bucketName }),
        );
        this.logger.log(`Bucket "${this.bucketName}" created successfully.`);

        // 3. Set Public Policy (Cho phép mọi người xem ảnh)
        await this.setBucketPublicPolicy();
      } catch (createError) {
        this.logger.error(`Failed to create bucket: ${createError.message}`);
        throw createError;
      }
    }
  }

  /**
   * Set quyền Read-Only cho Anonymous User
   */
  private async setBucketPublicPolicy() {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`], // Cho phép đọc tất cả file trong bucket
        },
      ],
    };

    try {
      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(policy),
        }),
      );
      this.logger.log(`Public access policy applied to "${this.bucketName}".`);
    } catch (error) {
      this.logger.error(`Failed to set bucket policy: ${error.message}`);
    }
  }

  /**
   * Upload file lên MinIO và trả về Public URL
   */
  async uploadFile(file: Express.Multer.File): Promise<string> {
    // 1. Tạo tên file độc nhất (tránh trùng lặp)
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;

    // 2. Chuẩn bị lệnh Upload
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer, // Dữ liệu file
      ContentType: file.mimetype,
      // ACL: 'public-read', // MinIO mới có thể không cần dòng này nếu Bucket đã set Policy public
    });

    try {
      // 3. Gửi lệnh
      await this.s3Client.send(command);

      // 4. Tạo URL công khai thủ công (Vì PutObject không trả về URL)
      // Format: http://localhost:9000/bucket-name/filename
      // const endpoint = this.configService.getOrThrow<string>('AWS_ENDPOINT');
      const externalEndpoint =
        this.configService.get<string>('MINIO_EXTERNAL_ENDPOINT') ||
        'http://localhost:9000';

      // const publicUrl = `${endpoint}/${this.bucketName}/${fileName}`;
      const publicUrl = `${externalEndpoint}/${this.bucketName}/${fileName}`;

      this.logger.log(`File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }
}
