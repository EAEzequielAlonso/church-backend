import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchesController } from './churches.controller';
import { ChurchesService } from './churches.service';
import { Church } from './entities/church.entity';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { User } from '../users/entities/user.entity';
import { Person } from 'src/users/entities/person.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Church, ChurchPerson, User, Person])],
  controllers: [ChurchesController],
  providers: [ChurchesService],
})
export class ChurchesModule {}
