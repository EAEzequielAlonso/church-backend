import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookCategory } from '../entities/book-category.entity';

@Injectable()
export class GetCategoriesUseCase {
    constructor(
        @InjectRepository(BookCategory)
        private categoryRepo: Repository<BookCategory>,
    ) { }

    async execute() {
        return this.categoryRepo.find({
            order: { name: 'ASC' }
        });
    }
}
