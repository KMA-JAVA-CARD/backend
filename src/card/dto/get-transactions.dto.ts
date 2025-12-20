import {
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from 'src/generated/prisma/client';

export class GetTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  cardSerial?: string;
}
