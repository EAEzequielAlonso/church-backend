import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp } from '../entities/follow-up.entity';
import { FollowUpStatus } from '../../common/enums';
import { MembershipStatus } from '../../members/enums/membership-status.enum';
import { MembersService } from '../../members/members.service';

@Injectable()
export class CreateFollowupUseCase {
    constructor(
        @InjectRepository(FollowUp)
        private readonly followupRepo: Repository<FollowUp>,
        private readonly membersService: MembersService,
    ) { }

    async execute(
        churchId: string,
        creatorMemberId: string,
        data: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            firstVisitDate?: Date;
        }
    ): Promise<FollowUp> {
        // Create ChurchPerson acting as Visitor
        const churchPerson = await this.membersService.createFromVisitor({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
        }, churchId, MembershipStatus.VISITOR);

        const followup = this.followupRepo.create({
            churchId,
            churchPersonId: churchPerson.id,
            createdById: creatorMemberId,
            status: FollowUpStatus.VISITOR,
            firstVisitDate: data.firstVisitDate || new Date()
        });

        return this.followupRepo.save(followup);
    }
}
