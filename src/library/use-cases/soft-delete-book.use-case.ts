import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { BookStatus } from '../../common/enums/library.enums';

@Injectable()
export class SoftDeleteBookUseCase {
    constructor(
        @InjectRepository(Book)
        private bookRepo: Repository<Book>,
    ) { }

    async execute(churchId: string, bookId: string, memberId: string) {
        const book = await this.bookRepo.findOne({
            where: { id: bookId, church: { id: churchId } }
        });

        if (!book) throw new NotFoundException('Libro no encontrado');

        // Check active loans? 
        if (book.status === BookStatus.LOANED) {
            throw new BadRequestException('No se puede eliminar un libro prestado. Debe devolverse primero.');
        }

        book.status = BookStatus.REMOVED;
        await this.bookRepo.save(book);

        return this.bookRepo.softDelete(bookId);
    }
}
