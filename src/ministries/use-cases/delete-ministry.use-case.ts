import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class DeleteMinistryUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        id: string,
        churchId: string,
        personId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<Ministry> {

        await this.ministryPolicy.assertCanManage(id, personId, churchId, systemRole, functionalRole);

        const ministry = await this.ministryRepo.findOne({
            where: { id },
        });

        if (!ministry) throw new NotFoundException('Ministerio no encontrado');

        return this.ministryRepo.remove(ministry);
    }
}
