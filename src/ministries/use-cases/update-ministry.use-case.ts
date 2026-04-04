import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { MinistryMember } from '../entities/ministry-member.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { UpdateMinistryDto } from '../dto/update-ministry.dto';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole, MinistryRole } from '../../common/enums';

@Injectable()
export class UpdateMinistryUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
        @InjectRepository(ChurchPerson)
        private readonly churchPersonRepo: Repository<ChurchPerson>,
        @InjectRepository(MinistryMember)
        private readonly memberRepo: Repository<MinistryMember>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        id: string,
        churchId: string,
        data: UpdateMinistryDto,
        personId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<Ministry> {

        // Authorization
        await this.ministryPolicy.assertCanManage(id, personId, churchId, systemRole, functionalRole);

        const ministry = await this.ministryRepo.findOne({
            where: { id },
            relations: ['leader', 'leader.person'],
        });

        if (!ministry) throw new NotFoundException('Ministerio no encontrado');

        if (data.leaderId) {
            if (ministry.leaderId !== data.leaderId) {
                const newLeader = await this.churchPersonRepo.findOne({
                    where: { id: data.leaderId },
                });
                
                if (newLeader) {
                    const oldLeaderId = ministry.leaderId;
                    ministry.leader = newLeader;
                    ministry.leaderId = newLeader.id;

                    // 1. Downgrade OLD leader if exists
                    if (oldLeaderId) {
                        const oldMembership = await this.memberRepo.findOne({
                            where: { ministryId: id, memberId: oldLeaderId },
                        });
                        if (oldMembership && oldMembership.roleInMinistry === MinistryRole.LEADER) {
                            oldMembership.roleInMinistry = MinistryRole.TEAM_MEMBER;
                            await this.memberRepo.save(oldMembership);
                        }
                    }

                    // 2. Upgrade NEW leader
                    let newMembership = await this.memberRepo.findOne({
                        where: { ministryId: id, memberId: data.leaderId },
                    });

                    if (newMembership) {
                        newMembership.roleInMinistry = MinistryRole.LEADER;
                        await this.memberRepo.save(newMembership);
                    } else {
                        // Add as new member if not already there
                        newMembership = this.memberRepo.create({
                            ministryId: id,
                            memberId: data.leaderId,
                            roleInMinistry: MinistryRole.LEADER,
                            joinedAt: new Date(),
                        });
                        await this.memberRepo.save(newMembership);
                    }
                }
            }
        }

        Object.assign(ministry, data);
        return this.ministryRepo.save(ministry);
    }
}
