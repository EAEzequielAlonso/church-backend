import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { BookCategory } from '../entities/book-category.entity';
import { CreateBookDto } from '../dto/create-book.dto';
import { BookOwnershipType, BookStatus } from '../../common/enums/library.enums';
import { ChurchPerson } from '../../members/entities/church-person.entity';

@Injectable()
export class CreateBookUseCase {
    constructor(
        @InjectRepository(Book)
        private bookRepo: Repository<Book>,
        @InjectRepository(BookCategory)
        private categoryRepo: Repository<BookCategory>,
        @InjectRepository(ChurchPerson)
        private memberRepo: Repository<ChurchPerson>,
    ) { }

    async execute(churchId: string, userId: string, memberId: string, role: string, dto: CreateBookDto) {
        // Validate Category (Global)
        const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
        if (!category) throw new NotFoundException('Categoría no encontrada');

        // Determine Ownership
        // Logic: 
        // - If created by Librarian/Admin -> Default to Church Owned unless specified otherwise (but usually specificed).
        // - If created by Member -> Default to Member Owned.

        let isChurchOwned = dto.isChurchOwned;
        let ownerMember: ChurchPerson | null = null;
        let ownershipType = dto.ownershipType;

        if (isChurchOwned === undefined) {
            // Heuristic: If implicit, assume Church owned if created by Admin/Librarian, Member owned if Member?
            // Better to be explicit or default to Church.
            // Requirement says Member can create their own books.
            // If payload says isChurchOwned=false, then owner is the member.
            isChurchOwned = true; // Default
        }

        if (!isChurchOwned) {
            // Member owned
            ownershipType = BookOwnershipType.MEMBER;
            // Validate member exists
            if (!memberId) throw new BadRequestException('Se requiere un ID de miembro para crear libros personales');

            ownerMember = await this.memberRepo.findOne({ where: { id: memberId, church: { id: churchId } } });
            if (!ownerMember) throw new NotFoundException('Miembro no encontrado');
        } else {
            // Church owned
            ownershipType = BookOwnershipType.CHURCH;
            // Check permissions? Controller handles RBAC, but business rule: 
            // Members cannot create Church books.
            // We assume controller passed valid context.
        }

        const book = this.bookRepo.create({
            ...dto,
            church: { id: churchId },
            category,
            ownerMember,
            isChurchOwned,
            ownershipType,
            status: BookStatus.AVAILABLE,
        });

        return this.bookRepo.save(book);
    }
}
