import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TransactionType } from 'src/generated/prisma/client.js';

export class CreateTransactionDto {
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  amount: number; // Nếu EARN: Là số tiền (VND). Nếu REDEEM: Là số điểm.

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  signature: string; // Chữ ký Hex do thẻ ký vào chuỗi dữ liệu giao dịch

  // timestamp: e.g "1702891234567" (milliseconds since epoch)
  @IsString()
  @IsNotEmpty()
  timestamp: string;
}
