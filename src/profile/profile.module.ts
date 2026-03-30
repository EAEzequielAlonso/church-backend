import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Church } from '../churches/entities/church.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Person, ChurchPerson, Church])],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
