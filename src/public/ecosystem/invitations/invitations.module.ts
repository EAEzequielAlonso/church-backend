import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { Invitation } from '../entities/invitation.entity';
import { EcosystemHistory } from '../entities/ecosystem-history.entity';
import { Person } from '../../../core/users/entities/person.entity';
import { EcosystemContributionsModule } from '../ecosystem-contributions.module';
import { AuthModule } from '../../../core/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, EcosystemHistory, Person]),
    EcosystemContributionsModule,
    AuthModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
