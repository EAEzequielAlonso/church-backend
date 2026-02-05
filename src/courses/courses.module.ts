import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeopleFunnelService } from './people-funnel.service';
import { CoursesController } from './courses.controller';
import { InvitedPeopleController } from './invited-people.controller';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { CourseParticipant } from './entities/course-participant.entity';
import { CourseGuest } from './entities/course-guest.entity';
import { ChurchMember } from '../members/entities/church-member.entity';
import { Church } from '../churches/entities/church.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { ContactsModule } from '../contacts/contacts.module';
import { SessionAttendance } from './entities/session-attendance.entity';
import { FamiliesModule } from '../families/families.module';
import { FollowUpPerson } from 'src/follow-ups/entities/follow-up-person.entity';
import { PersonInvited } from './entities/person-invited.entity';
import { Person } from 'src/users/entities/person.entity';

// USE CASES
import { ManageCourseUseCase } from './use-cases/manage-course.use-case';
import { DeleteCourseUseCase } from './use-cases/delete-course.use-case';
import { ViewCourseUseCase } from './use-cases/view-course.use-case';
import { ManageSessionUseCase } from './use-cases/manage-session.use-case';
import { EnrollParticipantUseCase } from './use-cases/enroll-participant.use-case';
import { RemoveParticipantUseCase } from './use-cases/remove-participant.use-case';
import { AddGuestUseCase } from './use-cases/add-guest.use-case';
import { RemoveGuestUseCase } from './use-cases/remove-guest.use-case';
import { PromoteGuestUseCase } from './use-cases/promote-guest.use-case';
import { RegisterAttendanceUseCase } from './use-cases/register-attendance.use-case';
import { GetCourseStatsUseCase } from './use-cases/get-course-stats.use-case';
import { UpdateGuestUseCase } from './use-cases/update-guest.use-case';
import { GetAttendanceUseCase } from './use-cases/get-attendance.use-case';

// POLICIES
import { CoursePolicy } from './policies/course.policy';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Course,
            CourseSession,
            CourseParticipant,
            CourseGuest,
            SessionAttendance,
            ChurchMember,
            Church,
            CalendarEvent,
            FollowUpPerson,
            PersonInvited,
            Person
        ]),
        ContactsModule,
        FamiliesModule
    ],
    controllers: [CoursesController, InvitedPeopleController],
    providers: [
        PeopleFunnelService,
        CoursePolicy,
        // Use Cases
        ManageCourseUseCase,
        DeleteCourseUseCase,
        ViewCourseUseCase,
        ManageSessionUseCase,
        EnrollParticipantUseCase,
        RemoveParticipantUseCase,
        AddGuestUseCase,
        RemoveGuestUseCase,
        UpdateGuestUseCase,
        PromoteGuestUseCase,
        RegisterAttendanceUseCase,
        GetCourseStatsUseCase,
        GetAttendanceUseCase
    ],
    exports: [PeopleFunnelService]
})
export class CoursesModule { }
