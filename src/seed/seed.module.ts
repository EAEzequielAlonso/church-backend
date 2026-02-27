import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

import { User } from '../users/entities/user.entity';
import { Church } from '../churches/entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Family } from '../families/entities/family.entity';

import { Group } from '../groups/entities/group.entity';
import { GroupParticipant } from '../groups/entities/group-participant.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { Person } from '../users/entities/person.entity';
import { FamilyMember } from '../families/entities/family-member.entity';
import { Account } from '../treasury/entities/account.entity';
import { CareProcess } from '../counseling/entities/care-process.entity';
import { CareParticipant } from '../counseling/entities/care-participant.entity';
import { CareNote } from '../counseling/entities/care-note.entity';
import { CareSession } from '../counseling/entities/care-session.entity';
import { Book } from '../library/entities/book.entity';
import { Loan } from '../library/entities/loan.entity';
import { FollowUp } from 'src/follow-ups/entities/follow-up.entity';

import { TransactionCategory } from 'src/treasury/entities/transaction-category.entity';
import { Ministry } from 'src/ministries/entities/ministry.entity';
import { MinistryMember } from 'src/ministries/entities/ministry-member.entity';
import { ServiceDuty } from 'src/ministries/entities/service-duty.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Church,
      ChurchPerson,
      Group,
      GroupParticipant,
      Family,
      FamilyMember,
      TreasuryTransaction,
      Person,
      Account,
      CareProcess,
      CareParticipant,
      CareNote,
      CareSession,
      Book,
      Loan,

      FollowUp,
      TransactionCategory,
      Ministry,
      MinistryMember,
      ServiceDuty
    ])
  ],
  controllers: [SeedController],
  providers: [SeedService]
})
export class SeedModule implements OnModuleInit {
  constructor(private readonly seedService: SeedService) { }

  async onModuleInit() {
    // Run seed on startup (check inside service ensures no duplicates)
    // Force restart for debugging 2
    await this.seedService.run();
  }
}
