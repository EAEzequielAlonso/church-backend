import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupMember } from '../entities/small-group-member.entity'; // Added
import { ChurchMember } from '../../members/entities/church-member.entity'; // Added
import { SmallGroupStatus, SmallGroupRole } from '../../common/enums'; // Added SmallGroupRole
import { SmallGroupPolicy } from '../policies/small-group.policy';

@Injectable()
export class ManageSmallGroupUseCase {
    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(SmallGroup)
        private readonly groupRepository: Repository<SmallGroup>,
        @InjectRepository(ChurchMember)
        private readonly memberRepository: Repository<ChurchMember>,
        @InjectRepository(SmallGroupMember)
        private readonly groupMemberRepository: Repository<SmallGroupMember>,
        private readonly policy: SmallGroupPolicy
    ) { }

    async create(createDto: any, churchId: string): Promise<SmallGroup> {
        return this.dataSource.transaction(async (manager) => {
            // 1. Create Group
            const group = this.groupRepository.create({
                ...createDto,
                church: { id: churchId },
            } as unknown as SmallGroup);

            const savedGroup = await manager.save(group);

            // 2. Assign Leader (Mandatory)
            if (!createDto.leaderId) {
                // Determine if we should throw or allow empty (as per user request "cannot create without owner")
                throw new BadRequestException('Es obligatorio asignar un encargado al crear el grupo');
            }

            const leaderMember = await manager.findOne(ChurchMember, { where: { id: createDto.leaderId } });
            if (!leaderMember) {
                throw new NotFoundException('El encargado seleccionado no existe como miembro');
            }

            const groupMember = this.groupMemberRepository.create({
                group: savedGroup,
                member: leaderMember,
                role: SmallGroupRole.MODERATOR
            });

            await manager.save(groupMember);

            return savedGroup;
        });
    }

    async update(id: string, updateDto: any, user: any, isPrivileged: boolean = false): Promise<SmallGroup> {
        return this.dataSource.transaction(async (manager) => {
            const group = await manager.findOne(SmallGroup, { where: { id }, relations: ['members', 'members.member'] });

            if (!group) {
                throw new NotFoundException(`Small Group with ID ${id} not found`);
            }

            // Domain Policy Checks: Skip ownership check if privileged (Admin/Auditor)
            if (!isPrivileged) {
                this.policy.ensureUserIsGroupLeader(user, group);
            }

            if (updateDto.status) {
                this.policy.ensureValidStatusTransition(group, updateDto.status);
            } else {
                this.policy.ensureGroupIsNotFinished(group);
            }

            // Apply updates
            // Check if leader is being changed
            if (updateDto.leaderId) {
                // Check if new leader is ALREADY a member
                const membership = group.members.find(m => m.member.id === updateDto.leaderId);
                if (!membership) {
                    throw new BadRequestException('El nuevo encargado debe ser ya un participante del grupo. Agrégalo primero.');
                }

                // Demote old leader(s)
                for (const m of group.members) {
                    if (m.role === SmallGroupRole.MODERATOR) {
                        m.role = SmallGroupRole.PARTICIPANT;
                        await manager.save(m);
                    }
                }

                // Promote new leader
                membership.role = SmallGroupRole.MODERATOR;
                await manager.save(membership);

                // Remove leaderId from DTO if it's meant to be mapped to entity properties strictly (though entity doesn't have leaderId column, usually handled by relationship)
                delete updateDto.leaderId;
            }

            const updatedGroup = await manager.preload(SmallGroup, {
                id,
                ...updateDto
            });

            return manager.save(updatedGroup);
        });
    }
}
