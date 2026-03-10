import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { ChurchPerson } from '../../members/entities/church-person.entity';
import { UpdateMinistryDto } from '../dto/update-ministry.dto';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class UpdateMinistryUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
        @InjectRepository(ChurchPerson)
        private readonly churchPersonRepo: Repository<ChurchPerson>,
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
            if (ministry.leader?.person.id !== data.leaderId) {
                const newLeader = await this.churchPersonRepo.findOne({
                    where: { id: data.leaderId },
                });
                if (newLeader) {
                    ministry.leader = newLeader;
                }
            }
        }

        Object.assign(ministry, data);
        return this.ministryRepo.save(ministry);
    }
}
