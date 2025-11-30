import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { CardModule } from './card/card.module';

@Module({
  imports: [ConfigModule.forRoot(), CardModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
