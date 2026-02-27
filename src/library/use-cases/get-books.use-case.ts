import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';
import { BookStatus } from '../../common/enums/library.enums';

interface GetBooksFilter {
    search?: string;
    categoryId?: string;
    ownerMemberId?: string;
    isChurchOwned?: boolean; // 'true', 'false', or undefined
    status?: BookStatus; // 'AVAILABLE', 'LOANED', 'REMOVED'
    availability?: 'AVAILABLE' | 'UNAVAILABLE'; // Computed filter
}

@Injectable()
export class GetBooksUseCase {
    constructor(
        @InjectRepository(Book)
        private bookRepo: Repository<Book>,
    ) { }

    async execute(churchId: string, filters: GetBooksFilter, page: number = 1, limit: number = 10) {
        const query = this.bookRepo.createQueryBuilder('book')
            .leftJoinAndSelect('book.category', 'category')
            .leftJoinAndSelect('book.ownerMember', 'owner')
            .leftJoinAndSelect('owner.person', 'ownerPerson')
            .where('book.churchId = :churchId', { churchId });

        if (filters.search) {
            query.andWhere('(book.title ILIKE :search OR book.author ILIKE :search OR book.isbn ILIKE :search)', { search: `%${filters.search}%` });
        }

        if (filters.categoryId) {
            query.andWhere('book.categoryId = :categoryId', { categoryId: filters.categoryId });
        }

        if (filters.ownerMemberId) {
            query.andWhere('book.ownerMemberId = :ownerMemberId', { ownerMemberId: filters.ownerMemberId });
        }

        if (filters.isChurchOwned !== undefined) {
            query.andWhere('book.isChurchOwned = :isChurchOwned', { isChurchOwned: filters.isChurchOwned });
        }

        if (filters.status) {
            query.andWhere('book.status = :status', { status: filters.status });
        }

        if (filters.availability === 'AVAILABLE') {
            query.andWhere('book.status = :availStatus', { availStatus: BookStatus.AVAILABLE });
        } else if (filters.availability === 'UNAVAILABLE') {
            query.andWhere('book.status != :availStatus', { availStatus: BookStatus.AVAILABLE });
        }

        query.orderBy('book.createdAt', 'DESC');

        const skip = (page - 1) * limit;
        query.skip(skip).take(limit);

        const [data, total] = await query.getManyAndCount();

        return {
            data,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
                limit
            }
        };
    }
}
