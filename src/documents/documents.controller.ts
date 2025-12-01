import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
  NotFoundException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from '../auth/user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { storageConfig } from './file-storage.config';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', storageConfig))
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @User() user: { userId: number },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.create(createDocumentDto, user.userId, file);
  }

  @Get()
  findAll(
    @User() user: { userId: number },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.documentsService.findAll(user.userId, +page, +limit, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @User() user: { userId: number }) {
    return this.documentsService.findOne(+id, user.userId);
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @User() user: { userId: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    const document = await this.documentsService.findOne(+id, user.userId);

    if (!document.filepath || !fs.existsSync(document.filepath)) {
      throw new NotFoundException('File not found');
    }

    const file = fs.createReadStream(document.filepath);
    res.set({
      'Content-Type': document.mimetype,
      'Content-Disposition': `attachment; filename="${document.filename}"`,
    });
    return new StreamableFile(file);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @User() user: { userId: number },
  ) {
    return this.documentsService.update(+id, updateDocumentDto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @User() user: { userId: number }) {
    return this.documentsService.remove(+id, user.userId);
  }
}
