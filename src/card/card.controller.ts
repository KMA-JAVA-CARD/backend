import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  UploadedFile,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { CardService } from './card.service';
import { RegisterCardDto, UpdateUserDto, CardResponseDto } from './dto';
import { MinioService } from 'src/minio/minio.service';
import { FileInterceptor } from '@nestjs/platform-express/multer';

@Controller('cards')
export class CardController {
  constructor(
    private readonly cardService: CardService,
    private readonly minioService: MinioService,
  ) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar'))
  @HttpCode(HttpStatus.CREATED)
  async registerCard(
    @Body() registerCardDto: RegisterCardDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CardResponseDto> {
    let avatarUrl: string | undefined = undefined;

    if (file) {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
        throw new BadRequestException('Only image files are allowed!');
      }

      avatarUrl = await this.minioService.uploadFile(file);
    }

    return this.cardService.registerCard({
      ...registerCardDto,
      avatarUrl,
    });
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
