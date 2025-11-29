import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CardService } from './card.service';
import { RegisterCardDto, UpdateUserDto, CardResponseDto } from './dto';

@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerCard(
    @Body() registerCardDto: RegisterCardDto,
  ): Promise<CardResponseDto> {
    return this.cardService.registerCard(registerCardDto);
  }

  @Get(':cardSerial')
  async getCardInfo(
    @Param('cardSerial') cardSerial: string,
  ): Promise<CardResponseDto> {
    return this.cardService.getCardInfo(cardSerial);
  }

  @Patch(':cardSerial/user')
  async updateUserInfo(
    @Param('cardSerial') cardSerial: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<CardResponseDto> {
    return this.cardService.updateUserInfo(cardSerial, updateUserDto);
  }
}
