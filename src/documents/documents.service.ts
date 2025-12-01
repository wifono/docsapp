import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
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
    tag?: string,
  ): Promise<{ data: Document[]; total: number; page: number; limit: number }> {
    let whereConditions:
      | FindOptionsWhere<Document>[]
      | FindOptionsWhere<Document> = { userId };

    if (search && tag) {
      whereConditions = [
        { userId, tag, name: Like(`%${search}%`) },
        { userId, tag, description: Like(`%${search}%`) },
      ];
    } else if (search) {
      whereConditions = [
        { userId, name: Like(`%${search}%`) },
        { userId, description: Like(`%${search}%`) },
        { userId, tag: Like(`%${search}%`) },
      ];
    } else if (tag) {
      whereConditions = { userId, tag };
    }

    const [data, total] = await this.documentRepo.findAndCount({
      where: whereConditions,
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

  async getAllTags(userId: number): Promise<string[]> {
    const results = await this.documentRepo
      .createQueryBuilder('document')
      .select('DISTINCT document.tag', 'tag')
      .where('document.userId = :userId', { userId })
      .andWhere('document.tag IS NOT NULL')
      .andWhere('document.tag != :empty', { empty: '' })
      .getRawMany<{ tag: string }>();

    return results.map((result) => result.tag);
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
