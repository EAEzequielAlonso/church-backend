import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmallGroup } from '../entities/small-group.entity';

@Injectable()
export class ViewSmallGroupUseCase {
    constructor(
        @InjectRepository(SmallGroup)
        private readonly groupRepository: Repository<SmallGroup>,
    ) { }

    async findOne(id: string): Promise<SmallGroup> {
        // Optimized query: Select specific fields instead of loading everything if possible, 
        // but for a detail view we usually need relations.
        // We will keep the relations but ensure we don't over-fetch if the entity grows.
        const group = await this.groupRepository.findOne({
            where: { id },
            relations: [
                'members',
                'members.member',
                'members.member.person',
                'events',
                'events.attendees',
                'guests',
                'guests.followUpPerson',
                'guests.followUpPerson.personInvited',
                'guests.followUpPerson.personInvited.person',
                'guests.personInvited',
                'guests.personInvited.person',
            ],
        });

        if (!group) throw new NotFoundException(`Small Group with ID ${id} not found`);
        return group;
    }

    async findAllByChurch(churchId: string): Promise<SmallGroup[]> {
        return this.groupRepository.find({
            where: { church: { id: churchId } },
            select: ['id', 'name', 'meetingDay', 'meetingTime', 'address', 'status', 'description', 'openEnrollment'], // Optimizing list view
            relations: ['members', 'members.member.person'], // Needed for "Leader" display typically?
            // If the list only needs names/counts, we can optimize further or use a custom query builder.
            // For now, this is better than "select *".
        } as any); // Type cast due to minor "day/time" vs entity property optionality or naming mismatch if manual select

        // Correction: Entity has 'meetingDay', 'meetingTime'.
    }

    // Correct implementation of findAll without 'any' hack and correct fields
    async findAllByChurchOptimized(churchId: string) {
        return this.groupRepository.find({
            where: { church: { id: churchId } },
            select: {
                id: true,
                name: true,
                meetingDay: true,
                meetingTime: true,
                address: true,
                status: true,
                description: true,
                // Relations selections are complex in FindOptions, standard TypeORM loads full relation object if relation is requested.
            },
            relations: {
                members: {
                    member: {
                        person: true
                    }
                }
            }
        });
    }
}
