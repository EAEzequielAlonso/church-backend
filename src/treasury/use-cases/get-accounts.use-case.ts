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
        return this.accountRepo
            .createQueryBuilder('account')
            .leftJoin('account.outgoingTransactions', 'outTx')
            .leftJoin('account.incomingTransactions', 'inTx')
            .select([
                'account.id',
                'account.name',
                'account.type',
                'account.currency',
                'account.balance',
                'account.churchId',
                'account.isArchived',
            ])
            .addSelect('COUNT(DISTINCT outTx.id) + COUNT(DISTINCT inTx.id)', 'transactionsCount')
            .where('account.churchId = :churchId', { churchId })
            .groupBy('account.id')
            .orderBy('account.name', 'ASC')
            .getRawAndEntities()
            .then(({ entities, raw }) => {
                return entities.map((entity, index) => ({
                    ...entity,
                    hasTransactions: parseInt(raw[index].transactionsCount, 10) > 0,
                }));
            });
    }
}
