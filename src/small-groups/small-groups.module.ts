import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SmallGroupsController } from './small-groups.controller';
import { SmallGroup } from './entities/small-group.entity';
import { SmallGroupMember } from './entities/small-group-member.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';

import { AgendaModule } from '../agenda/agenda.module';
import { ChurchMember } from 'src/members/entities/church-member.entity';

import { SmallGroupGuest } from './entities/small-group-guest.entity';
import { EnrollMemberUseCase } from './use-cases/enroll-member.use-case';
import { ManageSmallGroupUseCase } from './use-cases/manage-small-group.use-case';
import { ViewSmallGroupUseCase } from './use-cases/view-small-group.use-case';
import { AddGuestUseCase } from './use-cases/add-guest.use-case';
import { DeleteSmallGroupUseCase } from './use-cases/delete-small-group.use-case';
import { RemoveMemberUseCase } from './use-cases/remove-member.use-case';
import { RemoveGuestUseCase } from './use-cases/remove-guest.use-case';
import { SmallGroupPolicy } from './policies/small-group.policy';

@Module({
    imports: [TypeOrmModule.forFeature([SmallGroup, ChurchMember, SmallGroupMember, SmallGroupGuest, CalendarEvent]), AgendaModule],
    controllers: [SmallGroupsController],
    providers: [EnrollMemberUseCase, ManageSmallGroupUseCase, ViewSmallGroupUseCase, AddGuestUseCase, DeleteSmallGroupUseCase, RemoveMemberUseCase, RemoveGuestUseCase, SmallGroupPolicy],
    exports: [EnrollMemberUseCase, ManageSmallGroupUseCase, ViewSmallGroupUseCase, AddGuestUseCase, DeleteSmallGroupUseCase, RemoveMemberUseCase, RemoveGuestUseCase, SmallGroupPolicy]
})
export class SmallGroupsModule { }
