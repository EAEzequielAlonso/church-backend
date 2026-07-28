import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChurchesController } from './churches.controller';
import { ChurchesService } from './churches.service';
import { Church } from './entities/church.entity';

import { User } from '../users/entities/user.entity';
import { Person } from 'src/core/users/entities/person.entity';
import { ChurchClaim } from 'src/public/church/entities/church_claim.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Church, User, Person, ChurchClaim])],
  controllers: [ChurchesController],
  providers: [ChurchesService],
  exports: [TypeOrmModule],
})
export class ChurchesModule {}
