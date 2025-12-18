import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service.js';
import {
  RegisterCardDto,
  UpdateUserDto,
  CardResponseDto,
  VerifyCardDto,
  CreateTransactionDto,
} from './dto';
import * as crypto from 'crypto';

@Injectable()
export class CardService {
  constructor(private prisma: PrismaService) {}

  async registerCard(
    registerCardDto: RegisterCardDto,
  ): Promise<CardResponseDto> {
    const {
      cardSerial,
      publicKey,
      pointBalance = 20, // Mặc định tặng 20 điểm khi đăng ký
      fullName,
      phone,
      email,
      address,
      dob,
      avatarUrl,
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
        avatarUrl,
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
        avatarUrl: result.avatarUrl,
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
        avatarUrl: card.user.avatarUrl,
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
        ...(updateUserDto.avatarUrl !== undefined && {
          avatarUrl: updateUserDto.avatarUrl,
        }),
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
        avatarUrl: updatedUser.avatarUrl,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    };
  }

  generateChallenge(): string {
    // Tạo 32 bytes ngẫu nhiên -> chuyển sang Hex
    return crypto.randomBytes(32).toString('hex').toUpperCase();
  }

  // 2. XÁC THỰC CHỮ KÝ (VERIFY)
  async verifyCardSignature(dto: VerifyCardDto) {
    // A. Tìm thẻ trong DB
    const card = await this.prisma.card.findFirst({
      where: { cardSerial: dto.cardSerial },
    });

    if (!card) {
      throw new NotFoundException('Card ID not found in system');
    }

    // B. Lấy Public Key (Modulus)
    const modulusHex = card.publicKey; // Cột publicKey lưu Modulus
    if (!modulusHex) {
      throw new BadRequestException('System error: Member has no Public Key');
    }

    try {
      // C. Dựng lại Public Key Object từ Modulus + Exponent
      // NodeJS hỗ trợ format JWK (JSON Web Key) rất tiện
      const publicKey = crypto.createPublicKey({
        key: {
          kty: 'RSA',
          n: Buffer.from(modulusHex, 'hex').toString('base64url'), // Modulus
          e: Buffer.from('010001', 'hex').toString('base64url'), // Exponent (65537)
        },
        format: 'jwk',
      });

      // D. Thực hiện Verify
      // Applet dùng: ALG_RSA_SHA_PKCS1 -> NodeJS dùng: 'SHA1'
      const verify = crypto.createVerify('SHA1');
      verify.update(Buffer.from(dto.challenge, 'hex'));
      verify.end();

      const isValid = verify.verify(
        publicKey,
        Buffer.from(dto.signature, 'hex'),
      );

      if (isValid) {
        // E. Nếu khớp -> Trả về thông tin User (Thành công!)
        // (Huynh có thể tạo JWT Token ở đây nếu muốn login luôn)
        return {
          success: true,
          message: 'Authentication Successful',
        };
      } else {
        throw new BadRequestException(
          'Signature verification failed! (Fake Card?)',
        );
      }
    } catch (error) {
      console.error('Crypto Error:', error);
      throw new BadRequestException(
        'Verification process failed: ' + error.message,
      );
    }
  }

  // 3. XỬ LÝ GIAO DỊCH (TÍCH/TIÊU ĐIỂM)
  async processTransaction(cardSerial: string, dto: CreateTransactionDto) {
    // A. Tìm thẻ
    const card = await this.prisma.card.findUnique({
      where: { cardSerial },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }

    // Tái tạo lại chuỗi dữ liệu mà Frontend đã gửi xuống thẻ để ký
    const rawData = `${dto.type}|${dto.amount}|${dto.timestamp}`;

    // Lấy Public Key từ DB
    const publicKey = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: Buffer.from(card.publicKey, 'hex').toString('base64url'),
        e: Buffer.from('010001', 'hex').toString('base64url'),
      },
      format: 'jwk',
    });

    // Verify chữ ký
    const verify = crypto.createVerify('SHA1');
    verify.update(Buffer.from(rawData));
    verify.end();

    const isValid = verify.verify(publicKey, Buffer.from(dto.signature, 'hex'));

    if (!isValid) {
      throw new BadRequestException(
        'Invalid signature for transaction data! (Fake Card?)',
      );
    }

    const CONVERSION_RATE = 10000; // 10,000 VND = 1 Point
    let pointChange = Math.floor(dto.amount / CONVERSION_RATE);

    // B. Tính toán điểm
    if (dto.type === 'EARN') {
      // Tích điểm: amount là VND -> Chia cho tỷ giá
      // pointChange = Math.floor(dto.amount / CONVERSION_RATE);
      if (pointChange === 0) {
        throw new BadRequestException(
          'Transaction amount too small to earn points',
        );
      }
    } else if (dto.type === 'REDEEM') {
      pointChange = -pointChange; // Số âm để trừ

      // Kiểm tra số dư
      if (card.pointBalance + pointChange < 0) {
        throw new BadRequestException('Insufficient point balance');
      }
    }

    // C. Thực hiện Transaction (DB Transaction để an toàn: Tạo lịch sử + Update số dư cùng lúc)
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Tạo lịch sử giao dịch
      const transaction = await tx.transaction.create({
        data: {
          cardId: card.id,
          type: dto.type,
          amount: Math.abs(pointChange), // Lưu số điểm biến động (dương)
          description:
            dto.description ||
            (dto.type === 'EARN'
              ? `Earn from ${dto.amount} VND`
              : 'Redeem points'),
        },
      });

      // 2. Cập nhật số dư thẻ
      const updatedCard = await tx.card.update({
        where: { id: card.id },
        data: {
          pointBalance: {
            increment: pointChange, // Cộng số âm nếu là REDEEM
          },
        },
        include: { user: true }, // Trả về cả info user để UI cập nhật
      });

      return { transaction, updatedCard };
    });

    return {
      success: true,
      newBalance: result.updatedCard.pointBalance,
      transactionId: result.transaction.id,
      pointChange: pointChange,
    };
  }
}
