import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { AccountType } from '../enums/treasury.enums';

@Injectable()
export class GetAccountBalancesUseCase {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async execute(churchId: string) {
    return this.accountRepo.find({
      where: { church: { id: churchId } },
      order: { name: 'ASC' },
    });
  }
}
