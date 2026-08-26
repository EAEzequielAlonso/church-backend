import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Person } from './entities/person.entity';

import { ChurchPublicProfile } from 'src/public/church/entities/church_public_profile.entity';
import { EcosystemContributionsModule } from 'src/public/ecosystem/ecosystem-contributions.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Person, ChurchPublicProfile]),
    EcosystemContributionsModule,
    StorageModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
