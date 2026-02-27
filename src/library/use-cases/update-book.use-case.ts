import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { BookCategory } from '../entities/book-category.entity';
import { UpdateBookDto } from '../dto/create-book.dto';

@Injectable()
export class UpdateBookUseCase {
    constructor(
        @InjectRepository(Book)
        private bookRepo: Repository<Book>,
        @InjectRepository(BookCategory)
        private categoryRepo: Repository<BookCategory>,
    ) { }

    async execute(churchId: string, bookId: string, memberId: string, dto: UpdateBookDto) {
        const book = await this.bookRepo.findOne({
            where: { id: bookId, church: { id: churchId } },
            relations: ['ownerMember']
        });

        if (!book) throw new NotFoundException('Libro no encontrado');

        // RBAC Check: Only Owner or Librarian can edit
        // Implementation note: Controller check role. If Member role, check ownership.
        // Business Rule: Member can only edit their own books.
        if (!book.isChurchOwned) {
            if (book.ownerMemberId !== memberId) {
                // Implicit check: if not church owned, must be owner. 
                // If caller is Librarian, they might edit member books? Requirement says "Member create their own books, Edit/delete ONLY their books".
                // Assuming Librarians can moderate? Requirement doesn't explicitly forbid Librarian editing Member books, but implies separation.
                // Let's enforce: If Member-owned, only Owner can edit.
                throw new ForbiddenException('No tienes permiso para editar este libro');
            }
        }

        if (dto.categoryId) {
            const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
            if (!category) throw new NotFoundException('Categoría no encontrada');
            book.category = category;
        }

        // Update fields
        Object.assign(book, dto);

        return this.bookRepo.save(book);
    }
}
