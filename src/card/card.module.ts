import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [CardService, PrismaService],
  controllers: [CardController],
})
export class CardModule {}
