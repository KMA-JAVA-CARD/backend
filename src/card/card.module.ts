import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { MinioModule } from 'src/minio/minio.module';

@Module({
  imports: [MinioModule],
  providers: [CardService, PrismaService],
  controllers: [CardController],
})
export class CardModule {}
