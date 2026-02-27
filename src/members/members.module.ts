import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { ChurchPerson } from './entities/church-person.entity';
import { User } from '../users/entities/user.entity';
import { Person } from 'src/users/entities/person.entity';
import { CareParticipant } from 'src/counseling/entities/care-participant.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ChurchPerson, User, Person, CareParticipant])],
    controllers: [MembersController],
    providers: [MembersService],
    exports: [MembersService],
})
export class MembersModule { }
