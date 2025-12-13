/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME')!;

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
      const endpoint = this.configService.getOrThrow<string>('AWS_ENDPOINT');
      const publicUrl = `${endpoint}/${this.bucketName}/${fileName}`;

      this.logger.log(`File uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }
}
