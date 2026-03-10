import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

@Injectable()
export class GetAccountBalancesUseCase {
    constructor(
        @InjectRepository(Account)
        private readonly accountRepo: Repository<Account>,
    ) { }

    async execute(churchId: string) {
        const accounts = await this.accountRepo.find({
            where: { churchId },
        });

        return accounts.map((acc) => ({
            id: acc.id,
            name: acc.name,
            balance: Number(acc.balance),
            currency: acc.currency,
            type: acc.type,
        }));
    }
}
