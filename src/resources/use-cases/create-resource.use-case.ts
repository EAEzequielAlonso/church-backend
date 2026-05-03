import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyResource } from '../entities/study-resource.entity';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { ResourceType } from '../enums/resource.enums';
import { Book } from '../../library/entities/book.entity';

function detectResourceType(url: string | undefined): { type: ResourceType, thumbnail?: string } {
  if (!url) return { type: ResourceType.LINK };
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/i);
  if (ytMatch) {
    return {
      type: ResourceType.YOUTUBE,
      thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    };
  }
  if (url.includes('drive.google.com')) {
    return { type: ResourceType.DRIVE };
  }
  return { type: ResourceType.LINK };
}

@Injectable()
export class CreateResourceUseCase {
  constructor(
    @InjectRepository(StudyResource)
    private resourceRepo: Repository<StudyResource>,
    @InjectRepository(Book)
    private bookRepo: Repository<Book>,
  ) {}

  async execute(churchId: string, dto: CreateResourceDto): Promise<StudyResource> {
    let type = dto.type;
    let thumbnail = dto.thumbnail;

    if (dto.libraryBookId) {
      // Validate library book exists and belongs to the same church
      const book = await this.bookRepo.findOne({
        where: { id: dto.libraryBookId, churchId },
      });
      if (!book) {
        throw new BadRequestException('El libro especificado no existe o no pertenece a esta iglesia.');
      }
      type = ResourceType.BOOK;
    } else {
      // Auto-detect type and thumbnail if not explicitly provided
      const detection = detectResourceType(dto.url);
      if (!type) type = detection.type;
      if (!thumbnail && detection.thumbnail) thumbnail = detection.thumbnail;
    }

    if (!type) type = ResourceType.LINK;

    const resource = this.resourceRepo.create({
      ...dto,
      churchId,
      type,
      thumbnail,
    });
    return this.resourceRepo.save(resource);
  }
}
