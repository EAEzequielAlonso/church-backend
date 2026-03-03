import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { LibraryPolicy } from '../policies/library.policy';
import { BookStatus } from '../enums/library.enums';

@Injectable()
export class SoftDeleteBookUseCase {
  constructor(
    @InjectRepository(Book)
    private bookRepo: Repository<Book>,
    private policy: LibraryPolicy,
  ) { }

  async execute(
    churchId: string,
    bookId: string,
    memberId: string,
    roles: string[],
  ) {
    const book = await this.bookRepo.findOne({
      where: { id: bookId, churchId },
    });

    if (!book) throw new NotFoundException('Libro no encontrado');

    // Policy: only owner or LIBRARIAN, and not while actively loaned
    this.policy.assertCanDeleteBook(book, roles, memberId);

    book.status = BookStatus.REMOVED;
    await this.bookRepo.save(book);

    return this.bookRepo.softDelete(bookId);
  }
}
