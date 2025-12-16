import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyCardDto {
  @IsString()
  @IsNotEmpty()
  cardSerial: string;

  @IsString()
  @IsNotEmpty()
  challenge: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}
