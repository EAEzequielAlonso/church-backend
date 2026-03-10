import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

/**
 * Lock accounts in ascending order of ID to prevent deadlocks.
 * Must be called inside a TypeORM transaction (manager.getRepository).
 */
export async function lockAccountsInOrder(
    accountRepo: Repository<Account>,
    accountIds: string[],
    churchId: string,
): Promise<Map<string, Account>> {
    const sorted = [...new Set(accountIds.filter(Boolean))].sort();
    const locked = new Map<string, Account>();

    for (const id of sorted) {
        const account = await accountRepo.findOne({
            where: { id, churchId },
            lock: { mode: 'pessimistic_write' },
        });
        if (!account)
            throw new NotFoundException(
                `Account ${id} not found or does not belong to this church.`,
            );
        locked.set(id, account);
    }

    return locked;
}
