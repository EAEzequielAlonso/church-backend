import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { ChurchPerson } from './entities/church-person.entity';
import { JoinRequest } from './entities/join-request.entity';
import { User } from '../users/entities/user.entity';
import { Person } from '../users/entities/person.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuthModule } from '../auth/auth.module'; // Added AuthModule

@Module({
  imports: [
    TypeOrmModule.forFeature([ChurchPerson, JoinRequest, User, Person]),
    SubscriptionsModule,
    forwardRef(() => AuthModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
