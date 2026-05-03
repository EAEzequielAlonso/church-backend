import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyResource } from '../entities/study-resource.entity';
import { UpdateResourceDto } from '../dto/create-resource.dto';
import { Book } from '../../library/entities/book.entity';
import { ResourceType } from '../enums/resource.enums';

@Injectable()
export class UpdateResourceUseCase {
  constructor(
    @InjectRepository(StudyResource)
    private resourceRepo: Repository<StudyResource>,
    @InjectRepository(Book)
    private bookRepo: Repository<Book>,
  ) {}

  async execute(churchId: string, id: string, dto: UpdateResourceDto): Promise<StudyResource> {
    const resource = await this.resourceRepo.findOne({ where: { id, churchId } });
    if (!resource) throw new NotFoundException('Recurso no encontrado');

    if (dto.libraryBookId) {
      const book = await this.bookRepo.findOne({
        where: { id: dto.libraryBookId, churchId },
      });
      if (!book) {
        throw new BadRequestException('El libro especificado no existe o no pertenece a esta iglesia.');
      }
      dto.type = ResourceType.BOOK;
    }

    Object.assign(resource, dto);
    return this.resourceRepo.save(resource);
  }
}
