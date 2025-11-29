import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterCardDto, UpdateUserDto, CardResponseDto } from './dto';

@Injectable()
export class CardService {
  constructor(private prisma: PrismaService) {}

  async registerCard(
    registerCardDto: RegisterCardDto,
  ): Promise<CardResponseDto> {
    const {
      cardSerial,
      publicKey,
      pointBalance = 0,
      fullName,
      phone,
      email,
      address,
      dob,
    } = registerCardDto;

    // Check if card serial already exists
    const existingCard = await this.prisma.card.findUnique({
      where: { cardSerial },
    });

    if (existingCard) {
      throw new ConflictException('Card serial already registered');
    }

    // Check if phone already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already registered');
    }

    // Create user and card in a transaction
    const result = await this.prisma.user.create({
      data: {
        fullName,
        phone,
        email,
        address,
        dob: dob ? new Date(dob) : null,
        card: {
          create: {
            cardSerial,
            publicKey,
            pointBalance,
          },
        },
      },
      include: {
        card: true,
      },
    });

    return {
      id: result.card!.id,
      cardSerial: result.card!.cardSerial,
      publicKey: result.card!.publicKey,
      pointBalance: result.card!.pointBalance,
      status: result.card!.status,
      createdAt: result.card!.createdAt,
      updatedAt: result.card!.updatedAt,
      user: {
        id: result.id,
        fullName: result.fullName,
        phone: result.phone,
        email: result.email,
        address: result.address,
        dob: result.dob,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    };
  }

  async getCardInfo(cardSerial: string): Promise<CardResponseDto> {
    const card = await this.prisma.card.findUnique({
      where: { cardSerial },
      include: {
        user: true,
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    return {
      id: card.id,
      cardSerial: card.cardSerial,
      publicKey: card.publicKey,
      pointBalance: card.pointBalance,
      status: card.status,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      user: {
        id: card.user.id,
        fullName: card.user.fullName,
        phone: card.user.phone,
        email: card.user.email,
        address: card.user.address,
        dob: card.user.dob,
        createdAt: card.user.createdAt,
        updatedAt: card.user.updatedAt,
      },
    };
  }

  async updateUserInfo(
    cardSerial: string,
    updateUserDto: UpdateUserDto,
  ): Promise<CardResponseDto> {
    // First check if card exists
    const card = await this.prisma.card.findUnique({
      where: { cardSerial },
      include: { user: true },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    // If phone is being updated, check if it's already taken by another user
    if (updateUserDto.phone && updateUserDto.phone !== card.user.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone: updateUserDto.phone },
      });

      if (existingUser) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // Update user information
    const updatedUser = await this.prisma.user.update({
      where: { id: card.userId },
      data: {
        ...(updateUserDto.fullName && { fullName: updateUserDto.fullName }),
        ...(updateUserDto.phone && { phone: updateUserDto.phone }),
        ...(updateUserDto.email !== undefined && {
          email: updateUserDto.email,
        }),
        ...(updateUserDto.address !== undefined && {
          address: updateUserDto.address,
        }),
        ...(updateUserDto.dob && { dob: new Date(updateUserDto.dob) }),
      },
      include: {
        card: true,
      },
    });

    return {
      id: updatedUser.card!.id,
      cardSerial: updatedUser.card!.cardSerial,
      publicKey: updatedUser.card!.publicKey,
      pointBalance: updatedUser.card!.pointBalance,
      status: updatedUser.card!.status,
      createdAt: updatedUser.card!.createdAt,
      updatedAt: updatedUser.card!.updatedAt,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        email: updatedUser.email,
        address: updatedUser.address,
        dob: updatedUser.dob,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    };
  }
}
