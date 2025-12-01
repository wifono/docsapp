import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import * as fs from 'fs';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    userId: number,
    file: Express.Multer.File,
  ): Promise<Document> {
    const document = this.documentRepo.create({
      ...createDocumentDto,
      userId,
      filename: file.originalname,
      filepath: file.path,
      mimetype: file.mimetype,
      filesize: file.size,
    });
    return this.documentRepo.save(document);
  }

  async findAll(
    userId: number,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: Document[]; total: number; page: number; limit: number }> {
    // ak je search, pridaj or cond pre name, description, tag
    if (search) {
      const [data, total] = await this.documentRepo.findAndCount({
        where: [
          { userId, name: Like(`%${search}%`) },
          { userId, description: Like(`%${search}%`) },
          { userId, tag: Like(`%${search}%`) },
        ],
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data,
        total,
        page,
        limit,
      };
    }

    // ak nie tak paginate data pre prihlaeneho usera
    const [data, total] = await this.documentRepo.findAndCount({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, userId: number): Promise<Document> {
    const document = await this.documentRepo.findOneBy({ id, userId });
    if (!document) {
      throw new NotFoundException(`Document with id ${id} not found`);
    }
    return document;
  }

  async update(
    id: number,
    updateDocumentDto: UpdateDocumentDto,
    userId: number,
  ): Promise<Document> {
    const document = await this.findOne(id, userId);
    await this.documentRepo.update(document.id, updateDocumentDto);
    return this.findOne(id, userId);
  }

  async remove(id: number, userId: number): Promise<void> {
    const document = await this.findOne(id, userId);

    if (document.filepath && fs.existsSync(document.filepath)) {
      fs.unlinkSync(document.filepath);
    }

    await this.documentRepo.delete(document.id);
  }
}
