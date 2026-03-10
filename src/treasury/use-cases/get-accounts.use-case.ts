import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

@Injectable()
export class GetAccountsUseCase {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepo: Repository<Account>,
    ) { }

    async execute(churchId: string) {
        return this.accountRepo.find({
            where: { churchId },
            order: { name: 'ASC' },
        });
    }
}
