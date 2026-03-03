import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { BookCategory } from '../entities/book-category.entity';
import { UpdateBookDto } from '../dto/create-book.dto';
import { LibraryPolicy } from '../policies/library.policy';

@Injectable()
export class UpdateBookUseCase {
  constructor(
    @InjectRepository(Book)
    private bookRepo: Repository<Book>,
    @InjectRepository(BookCategory)
    private categoryRepo: Repository<BookCategory>,
    private policy: LibraryPolicy,
  ) { }

  async execute(
    churchId: string,
    bookId: string,
    memberId: string,
    roles: string[],
    dto: UpdateBookDto,
  ) {
    const book = await this.bookRepo.findOne({
      where: { id: bookId, churchId },
    });

    if (!book) throw new NotFoundException('Libro no encontrado');

    // Policy: only owner or LIBRARIAN can edit
    this.policy.assertCanEditBook(book, roles, memberId);

    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Categoría no encontrada');
      book.category = category;
      book.categoryId = dto.categoryId;
    }

    // Only update allowed fields — ownership cannot be changed after creation
    if (dto.title) book.title = dto.title;
    if (dto.author) book.author = dto.author;
    if (dto.description !== undefined) book.description = dto.description;
    if (dto.isbn !== undefined) book.isbn = dto.isbn;
    if (dto.coverUrl !== undefined) book.coverUrl = dto.coverUrl;
    if (dto.code !== undefined) book.code = dto.code;
    if (dto.condition !== undefined) book.condition = dto.condition;
    if (dto.location !== undefined) book.location = dto.location;

    return this.bookRepo.save(book);
  }
}
