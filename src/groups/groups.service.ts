import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual } from 'typeorm';
import { Group } from './entities/group.entity';
import { GroupParticipant } from './entities/group-participant.entity';
import { GroupMeeting } from './entities/group-meeting.entity';
import { GroupAttendance } from './entities/group-attendance.entity';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { GroupRole, GroupType } from './enums/group.enums';
import { AgendaSyncService } from '../agenda/agenda-sync.service';
import { EventSourceType, CalendarEventType } from '../common/enums';
import { RegisterAttendanceDto, BulkAddParticipantsDto } from './dto/groups.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(GroupParticipant)
    private participantRepo: Repository<GroupParticipant>,
    @InjectRepository(GroupMeeting)
    private meetingRepo: Repository<GroupMeeting>,
    @InjectRepository(GroupAttendance)
    private attendanceRepo: Repository<GroupAttendance>,
    private readonly agendaSyncService: AgendaSyncService,
  ) { }

  async create(dto: CreateGroupDto, churchId: string) {
    // Logic to create a group
    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description,
      type: dto.type,
      visibility: dto.visibility,
      churchId: churchId,
    });

    const savedGroup = await this.groupRepo.save(group);

    // Auto-assign leader if ID is provided
    if (dto.leaderChurchPersonId) {
      const participant = this.participantRepo.create({
        churchPersonId: dto.leaderChurchPersonId,
        groupId: savedGroup.id,
        role: GroupRole.COORDINATOR,
      });
      await this.participantRepo.save(participant);
    }

    return savedGroup;
  }

  async findAll(churchId: string, type?: GroupType) {
    const query = this.groupRepo
      .createQueryBuilder('group')
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
      relations: [
        'participants',
        'participants.churchPerson',
        'participants.churchPerson.person',
        'meetings',
      ],
    });
    if (!group) throw new NotFoundException('Group not found');

    // Attendance Calculation (Phase 4)
    // 1. Get total past meetings
    const now = new Date();
    const totalMeetings = await this.meetingRepo.count({
      where: {
        groupId: id,
        date: LessThanOrEqual(now)
      }
    });

    // 2. Get present counts for all participants in one go
    const attendanceRecords = await this.attendanceRepo
      .createQueryBuilder('attendance')
      .innerJoin('attendance.meeting', 'meeting')
      .select('attendance.churchPersonId', 'churchPersonId')
      .addSelect('COUNT(*)', 'presentCount')
      .where('meeting.groupId = :groupId', { groupId: id })
      .andWhere('meeting.date <= :now', { now })
      .andWhere('attendance.present = :present', { present: true })
      .groupBy('attendance.churchPersonId')
      .getRawMany();

    const presentCountsMap = new Map(
      attendanceRecords.map(r => [r.churchPersonId, parseInt(r.presentCount)])
    );

    // 3. Map to participants
    (group as any).participants = group.participants.map(p => {
      const presentCount = presentCountsMap.get(p.churchPersonId) || 0;
      const rate = totalMeetings > 0 ? parseFloat((presentCount / totalMeetings).toFixed(2)) : null;

      return {
        ...p,
        attendance: {
          presentCount,
          totalMeetings,
          rate
        }
      };
    });

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

  async enrollParticipant(
    groupId: string,
    churchPersonId: string,
    churchId: string,
    role: GroupRole = GroupRole.PARTICIPANT,
  ) {
    const group = await this.findOne(groupId, churchId);

    // Check if member already exists
    const existing = await this.participantRepo.findOne({
      where: { groupId, churchPersonId },
    });
    if (existing) {
      throw new ConflictException('Person is already in this group');
    }

    const participant = this.participantRepo.create({
      groupId,
      churchPersonId,
      role,
    });

    return this.participantRepo.save(participant);
  }

  async bulkAddParticipants(
    groupId: string,
    dto: BulkAddParticipantsDto,
    churchId: string,
  ) {
    await this.findOne(groupId, churchId);

    const participants = dto.personIds.map((personId) => ({
      groupId,
      churchPersonId: personId,
      role: GroupRole.PARTICIPANT,
    }));

    // Using insert for efficiency and to avoid duplicates if possible, 
    // although we should check if they already exist too if we want to be safe.
    // Given the UI will filter them, we can do a simple check.

    return this.participantRepo.manager.transaction(async (manager) => {
      // Find which ones are NOT already in the group
      const existing = await manager.find(GroupParticipant, {
        where: {
          groupId,
          churchPersonId: In(dto.personIds)
        }
      });
      const existingIds = new Set(existing.map(e => e.churchPersonId));

      const toAdd = participants.filter(p => !existingIds.has(p.churchPersonId));

      if (toAdd.length === 0) return { success: true, added: 0 };

      const results = await manager.save(GroupParticipant, toAdd);
      return { success: true, added: results.length };
    });
  }

  async removeParticipant(
    groupId: string,
    churchPersonId: string,
    churchId: string,
  ) {
    // verify group exists and belongs to church
    await this.findOne(groupId, churchId);

    const existing = await this.participantRepo.findOne({
      where: { groupId, churchPersonId },
    });

    if (!existing) {
      throw new NotFoundException('Participant not found in this group');
    }

    return this.participantRepo.remove(existing);
  }

  async updateParticipantRole(
    groupId: string,
    churchPersonId: string,
    churchId: string,
    role: GroupRole,
  ) {
    // ensure group belongs to church
    await this.findOne(groupId, churchId);

    const existing = await this.participantRepo.findOne({
      where: { groupId, churchPersonId },
    });

    if (!existing) {
      throw new NotFoundException('Participant not found in this group');
    }

    existing.role = role;
    return this.participantRepo.save(existing);
  }

  async createMeeting(
    groupId: string,
    churchId: string,
    dto: { date: string; location?: string; notes?: string },
  ) {
    const group = await this.findOne(groupId, churchId);

    const startDate = new Date(dto.date);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // default 1h

    let meeting = this.meetingRepo.create({
      groupId,
      date: startDate,
      location: dto.location,
      notes: dto.notes,
    });
    meeting = await this.meetingRepo.save(meeting);

    const projection = await this.agendaSyncService.createProjection({
      title: `Encuentro: ${group.name}`,
      description: dto.notes,
      startDate: startDate,
      endDate: endDate,
      location: dto.location,
      sourceType: EventSourceType.GROUP_MEETING,
      sourceId: meeting.id,
      ownerId: groupId,
      type: this.getCalendarEventType(group.type),
    });

    meeting.calendarEventId = projection.id;
    return this.meetingRepo.save(meeting);
  }

  async updateMeeting(
    groupId: string,
    meetingId: string,
    churchId: string,
    dto: { date?: string; location?: string; notes?: string },
  ) {
    const group = await this.findOne(groupId, churchId);

    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId, groupId } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    const updatePayload: any = {
      type: this.getCalendarEventType(group.type),
    };

    if (dto.date) {
      const startDate = new Date(dto.date);
      meeting.date = startDate;
      updatePayload.startDate = startDate;
      updatePayload.endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    }
    if (dto.location !== undefined) {
      meeting.location = dto.location;
      updatePayload.location = dto.location;
    }
    if (dto.notes !== undefined) {
      meeting.notes = dto.notes;
      updatePayload.description = dto.notes;
    }

    const savedMeeting = await this.meetingRepo.save(meeting);

    if (Object.keys(updatePayload).length > 0) {
      await this.agendaSyncService.updateProjection(
        EventSourceType.GROUP_MEETING,
        meeting.id,
        updatePayload
      );
    }

    return savedMeeting;
  }

  async deleteMeeting(groupId: string, meetingId: string, churchId: string) {
    await this.findOne(groupId, churchId);

    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId, groupId } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    await this.agendaSyncService.deleteProjection(EventSourceType.GROUP_MEETING, meeting.id);

    return this.meetingRepo.remove(meeting);
  }

  async getMeetingAttendance(
    groupId: string,
    meetingId: string,
    churchId: string,
  ) {
    // Validate group belongs to church
    const group = await this.findOne(groupId, churchId);

    // Validate meeting belongs to group
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId, groupId } });
    if (!meeting) throw new NotFoundException('Meeting not found for this group');

    // Initial query to check if attendance exists
    const existingAttendance = await this.attendanceRepo.find({
      where: { meetingId },
      relations: ['churchPerson', 'churchPerson.person'],
    });

    if (existingAttendance.length > 0) {
      return existingAttendance;
    }

    // If no records, generate initial list from participants
    // findOne already checked churchId via group. Search participants for this specific group.
    const participants = await this.participantRepo.find({
      where: { groupId },
      relations: ['churchPerson', 'churchPerson.person'],
    });

    return participants.map((p) => ({
      id: null,
      meetingId: meetingId,
      churchPersonId: p.churchPersonId,
      churchPerson: p.churchPerson,
      present: false,
    }));
  }

  async registerAttendance(
    groupId: string,
    meetingId: string,
    dto: RegisterAttendanceDto,
    churchId: string,
  ) {
    // 1. Validate group belongs to church
    await this.findOne(groupId, churchId);

    // 2. Validate meeting belongs to group
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId, groupId } });
    if (!meeting) throw new NotFoundException('Meeting not found for this group');

    // 3. Batch validate participants (avoid N queries)
    const churchPersonIds = dto.items.map(i => i.churchPersonId);
    const validParticipants = await this.participantRepo.find({
      where: {
        groupId,
        churchPersonId: In(churchPersonIds)
      }
    });

    const validPersonIds = new Set(validParticipants.map(p => p.churchPersonId));
    const invalidItems = dto.items.filter(item => !validPersonIds.has(item.churchPersonId));

    if (invalidItems.length > 0) {
      throw new ConflictException(`Some people are not participants of this group: ${invalidItems.map(i => i.churchPersonId).join(', ')}`);
    }

    // Run in transaction for atomicity
    return this.attendanceRepo.manager.transaction(async (transactionalEntityManager) => {
      const results = [];

      for (const item of dto.items) {
        // Upsert logic: find existing or create new
        let attendance = await transactionalEntityManager.findOne(GroupAttendance, {
          where: { meetingId, churchPersonId: item.churchPersonId },
        });

        if (attendance) {
          attendance.present = item.present;
        } else {
          attendance = this.attendanceRepo.create({
            meetingId,
            churchPersonId: item.churchPersonId,
            present: item.present,
          });
        }

        results.push(await transactionalEntityManager.save(GroupAttendance, attendance));
      }

      return { success: true, count: results.length };
    });
  }

  private getCalendarEventType(groupType: GroupType): CalendarEventType {
    switch (groupType) {
      case GroupType.COURSE:
        return CalendarEventType.COURSE;
      case GroupType.ACTIVITY:
        return CalendarEventType.ACTIVITY;
      case GroupType.DISCIPLESHIP:
        return CalendarEventType.DISCIPLESHIP;
      case GroupType.MINISTRY_TEAM:
        return CalendarEventType.MINISTRY;
      case GroupType.SMALL_GROUP:
      default:
        return CalendarEventType.SMALL_GROUP;
    }
  }
}
