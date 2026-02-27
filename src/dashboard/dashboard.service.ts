import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChurchPerson } from '../members/entities/church-person.entity';
import { Group } from '../groups/entities/group.entity';
import { TreasuryTransaction } from '../treasury/entities/treasury-transaction.entity';
import { FollowUp } from '../follow-ups/entities/follow-up.entity';
import { FollowUpStatus, AccountType } from '../common/enums';
import { TransactionType } from '../treasury/enums/treasury.enums';
import { WorshipService, ServiceStatus } from '../worship/entities/worship-service.entity';
import { CalendarEvent } from '../agenda/entities/calendar-event.entity';
import { Repository, Between, MoreThan } from 'typeorm';
import * as dateFns from 'date-fns';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(ChurchPerson) private memberRepository: Repository<ChurchPerson>,
        @InjectRepository(Group) private groupRepository: Repository<Group>,
        @InjectRepository(TreasuryTransaction) private treasuryRepository: Repository<TreasuryTransaction>,
        @InjectRepository(FollowUp) private followUpRepository: Repository<FollowUp>,
        @InjectRepository(WorshipService) private worshipRepo: Repository<WorshipService>,
        @InjectRepository(CalendarEvent) private eventRepo: Repository<CalendarEvent>,
    ) { }

    async getStats(churchId: string) {
        // 1. Members Count
        const membersCount = await this.memberRepository.count({
            where: { church: { id: churchId } }
        });

        // Previous month members comparisons could be complex depending on if we have history. 
        // For MVP, we'll just mock the growth or calculate based on joinedAt if available.
        // Let's rely on joinedAt if it exists.
        const lastMonth = dateFns.subMonths(new Date(), 1);
        const newMembersLast30Days = await this.memberRepository.count({
            where: {
                church: { id: churchId },
                joinedAt: Between(dateFns.startOfMonth(lastMonth), new Date())
            }
        });

        // Active Groups
        const totalGroups = await this.groupRepository.count({ where: { church: { id: churchId } } });

        // 3. Treasury (Income this month)
        const start = dateFns.startOfMonth(new Date());
        const end = dateFns.endOfMonth(new Date());

        const incomeResult = await this.treasuryRepository
            .createQueryBuilder('tx')
            .select('SUM(tx.amount)', 'total')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.type = :type', { type: TransactionType.INCOME })
            .andWhere('tx.date BETWEEN :start AND :end', { start, end })
            .getRawOne();

        const monthlyIncome = parseFloat(incomeResult?.total || 0);

        // 4. Follow Ups (New Visitors)
        const newVisitorsCount = await this.followUpRepository.count({
            where: {
                church: { id: churchId },
                status: FollowUpStatus.VISITOR
            }
        });

        return {
            members: {
                total: membersCount,
                newLastMonth: newMembersLast30Days,
                growthPercentage: membersCount > 0 ? Math.round((newMembersLast30Days / membersCount) * 100) : 0
            },
            groups: {
                total: totalGroups,
                active: totalGroups, // Assuming all are active for now
            },
            treasury: {
                monthlyIncome: monthlyIncome,
                currency: 'USD' // Or church setting
            },
            visitors: {
                new: newVisitorsCount,
                pending: newVisitorsCount
            }
        };
    }

    async getUpcomingEvents(churchId: string) {
        // 1. Get Confirmed Worship Services (Future)
        const services = await this.worshipRepo.find({
            where: {
                church: { id: churchId },
                status: ServiceStatus.CONFIRMED,
                date: MoreThan(new Date())
            },
            take: 5,
            order: { date: 'ASC' }
        });

        // 2. Get Calendar Events (Future) - Activities, Courses, etc.
        const events = await this.eventRepo.find({
            where: {
                church: { id: churchId },
                startDate: MoreThan(new Date())
            },
            relations: ['organizer', 'group', 'ministry'], // Load relations
            take: 5,
            order: { startDate: 'ASC' }
        });

        // 3. Merge and Sort
        const combined = [
            ...services.map(s => ({
                id: s.id,
                type: 'WORSHIP',
                title: s.topic || 'Culto General',
                date: s.date,
                location: 'Auditorio',
                link: `/worship/${s.id}`,
                meta: {}
            })),
            ...events.map(event => {
                let link = '/calendar';
                if (event.group) {
                    link = `/groups/${event.group.id}/events`;
                } else if (event.ministry) {
                    link = `/ministries/${event.ministry.id}/events`;
                }

                return {
                    id: event.id,
                    type: event.type,
                    title: event.title,
                    date: event.startDate,
                    location: event.location,
                    link, // Generated link
                    meta: {
                        groupId: event.group?.id,
                        ministryId: event.ministry?.id
                    },
                    group: event.group ? { id: event.group.id, name: event.group.name } : null,
                };
            })
        ];

        // Sort by date ASC
        combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Return top 5
        return combined.slice(0, 5);
    }
}
