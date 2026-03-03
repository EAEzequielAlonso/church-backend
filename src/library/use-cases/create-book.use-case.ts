import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { BookCategory } from '../entities/book-category.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { CreateBookDto } from '../dto/create-book.dto';
import { BookOwnershipType, BookStatus } from '../enums/library.enums';
import { LibraryPolicy } from '../policies/library.policy';

@Injectable()
export class CreateBookUseCase {
  constructor(
    @InjectRepository(Book)
    private bookRepo: Repository<Book>,
    @InjectRepository(BookCategory)
    private categoryRepo: Repository<BookCategory>,
    @InjectRepository(ChurchPerson)
    private memberRepo: Repository<ChurchPerson>,
    private policy: LibraryPolicy,
  ) { }

  async execute(
    churchId: string,
    memberId: string,
    roles: string[],
    dto: CreateBookDto,
  ) {
    const ownershipType = dto.ownershipType ?? BookOwnershipType.CHURCH;

    // 1. Policy: role check + consistency
    this.policy.assertCanCreateBook(ownershipType, roles, memberId);
    this.policy.assertOwnershipConsistency(
      ownershipType,
      ownershipType === BookOwnershipType.MEMBER ? memberId : null,
    );

    // 2. Category
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    // 3. Owner member (only for MEMBER books)
    let ownerMember: ChurchPerson | null = null;
    if (ownershipType === BookOwnershipType.MEMBER) {
      ownerMember = await this.memberRepo.findOne({
        where: { id: memberId, church: { id: churchId } },
      });
      if (!ownerMember) throw new NotFoundException('Miembro no encontrado');
    }

    const book = this.bookRepo.create({
      title: dto.title,
      author: dto.author,
      description: dto.description,
      isbn: dto.isbn,
      coverUrl: dto.coverUrl,
      code: dto.code,
      condition: dto.condition,
      location: dto.location,
      ownershipType,
      ownerMember: ownerMember ?? undefined,
      ownerMemberId: ownerMember?.id ?? undefined,
      category,
      church: { id: churchId },
      status: BookStatus.AVAILABLE,
    });

    return this.bookRepo.save(book);
  }
}
