import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupParticipant } from './entities/group-participant.entity';
import { GroupMeeting } from './entities/group-meeting.entity';
import { GroupAttendance } from './entities/group-attendance.entity';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { GroupRole, GroupType } from './enums/group.enums';

@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(Group) private groupRepo: Repository<Group>,
        @InjectRepository(GroupParticipant) private participantRepo: Repository<GroupParticipant>,
        @InjectRepository(GroupMeeting) private meetingRepo: Repository<GroupMeeting>,
        @InjectRepository(GroupAttendance) private attendanceRepo: Repository<GroupAttendance>
    ) { }

    async create(dto: CreateGroupDto, churchId: string) {
        // Logic to create a group
        const group = this.groupRepo.create({
            name: dto.name,
            description: dto.description,
            type: dto.type,
            visibility: dto.visibility,
            churchId: churchId
        });

        const savedGroup = await this.groupRepo.save(group);

        // Auto-assign leader if ID is provided
        if (dto.leaderChurchPersonId) {
            const participant = this.participantRepo.create({
                churchPersonId: dto.leaderChurchPersonId,
                groupId: savedGroup.id,
                role: GroupRole.LEADER
            });
            await this.participantRepo.save(participant);
        }

        return savedGroup;
    }

    async findAll(churchId: string, type?: GroupType) {
        const query = this.groupRepo.createQueryBuilder('group')
            .where('group.churchId = :churchId', { churchId })
            .leftJoinAndSelect('group.participants', 'participants')
            .leftJoinAndSelect('participants.churchPerson', 'churchPerson')
            .leftJoinAndSelect('churchPerson.person', 'person');

        if (type) {
            query.andWhere('group.type = :type', { type });
        }

        return query.getMany();
    }

    async findOne(id: string, churchId: string) {
        const group = await this.groupRepo.findOne({
            where: { id, churchId },
            relations: ['participants', 'participants.churchPerson', 'participants.churchPerson.person', 'meetings']
        });
        if (!group) throw new NotFoundException('Group not found');
        return group;
    }

    async update(id: string, dto: UpdateGroupDto, churchId: string) {
        const group = await this.findOne(id, churchId);
        Object.assign(group, dto);
        return this.groupRepo.save(group);
    }

    async remove(id: string, churchId: string) {
        const group = await this.findOne(id, churchId);
        return this.groupRepo.remove(group);
    }

    async enrollParticipant(groupId: string, churchPersonId: string, churchId: string, role: GroupRole = GroupRole.MEMBER) {
        const group = await this.findOne(groupId, churchId);

        const existing = await this.participantRepo.findOne({
            where: { groupId, churchPersonId }
        });

        if (existing) {
            throw new ConflictException('Person is already in this group');
        }

        const participant = this.participantRepo.create({
            groupId,
            churchPersonId,
            role
        });

        return this.participantRepo.save(participant);
    }
}
