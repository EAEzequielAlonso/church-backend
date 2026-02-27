import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowUpsController } from './follow-ups.controller';
import { FollowUp } from './entities/follow-up.entity';
import { FollowUpNote } from './entities/follow-up-note.entity'; // FollowUpNote
import { ChurchPerson } from '../members/entities/church-person.entity';

import { MembersModule } from '../members/members.module';

// Use Cases
import { CreateFollowupUseCase } from './use-cases/create-followup.use-case';
import { GetFollowupsUseCase } from './use-cases/get-followups.use-case';
import { GetFollowupDetailUseCase } from './use-cases/get-followup-detail.use-case';
import { UpdateFollowupUseCase } from './use-cases/update-followup.use-case';
import { AssignFollowupUseCase } from './use-cases/assign-followup.use-case';
import { ChangeFollowupStatusUseCase } from './use-cases/change-followup-status.use-case';
import { CreateFollowupNoteUseCase } from './use-cases/create-followup-note.use-case';
import { GetFollowupNotesUseCase } from './use-cases/get-followup-notes.use-case';
import { RemoveFollowupUseCase } from './use-cases/remove-followup.use-case';
import { PromoteToMemberUseCase } from './use-cases/promote-to-member.use-case';
import { UpdateFollowupNoteUseCase } from './use-cases/update-followup-note.use-case';
import { DeleteFollowupNoteUseCase } from './use-cases/delete-followup-note.use-case';
import { FollowupPolicy } from './policies/followup.policy';

@Module({
    imports: [
        TypeOrmModule.forFeature([FollowUp, FollowUpNote, ChurchPerson]),
        MembersModule
    ],
    controllers: [FollowUpsController],
    providers: [
        FollowupPolicy,
        CreateFollowupUseCase,
        GetFollowupsUseCase,
        GetFollowupDetailUseCase,
        UpdateFollowupUseCase,
        AssignFollowupUseCase,
        ChangeFollowupStatusUseCase,
        CreateFollowupNoteUseCase,
        GetFollowupNotesUseCase,
        RemoveFollowupUseCase,
        PromoteToMemberUseCase,
        UpdateFollowupNoteUseCase,
        DeleteFollowupNoteUseCase,
    ],
    exports: [] // No service to export
})
export class FollowUpsModule { }
