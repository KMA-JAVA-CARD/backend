import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class RegisterCardDto {
  @IsString()
  @IsNotEmpty()
  cardSerial: string;

  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsDateString()
  @IsOptional()
  dob?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  pointBalance?: number;
}
