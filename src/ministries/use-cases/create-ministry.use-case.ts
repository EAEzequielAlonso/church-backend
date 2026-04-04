import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { MinistryMember } from '../entities/ministry-member.entity';
import { CreateMinistryDto } from '../dto/create-ministry.dto';
import { MinistryRole } from '../../common/enums';

@Injectable()
export class CreateMinistryUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
        @InjectRepository(ChurchPerson)
        private readonly churchPersonRepo: Repository<ChurchPerson>,
        @InjectRepository(MinistryMember)
        private readonly memberRepo: Repository<MinistryMember>,
    ) { }

    async execute(churchId: string, data: CreateMinistryDto): Promise<Ministry> {
        const ministryData: Partial<Ministry> = {
            ...data,
            churchId ,
            status: 'active',
        };

        if (data.leaderId) {
            const leader = await this.churchPersonRepo.findOne({
                where: { id: data.leaderId },
            });
            if (leader) {
                ministryData.leader = leader;
            }
        }

        const ministry = this.ministryRepo.create(ministryData);
        await this.ministryRepo.save(ministry);

        // Initial leader as member
        if (ministryData.leader) {
            const member = this.memberRepo.create({
                ministry,
                member: ministryData.leader,
                roleInMinistry: MinistryRole.LEADER,
                joinedAt: new Date(),
            });
            await this.memberRepo.save(member);
        }

        return this.ministryRepo.findOne({
            where: { id: ministry.id },
            relations: ['leader', 'leader.person'],
        });
    }
}
