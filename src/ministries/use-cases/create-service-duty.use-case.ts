import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceDuty } from '../entities/service-duty.entity';
import { Ministry } from '../entities/ministry.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class CreateServiceDutyUseCase {
    constructor(
        @InjectRepository(ServiceDuty)
        private readonly dutyRepo: Repository<ServiceDuty>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        name: string,
        behaviorType: string,
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<ServiceDuty> {

        await this.ministryPolicy.assertCanManage(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const duty = this.dutyRepo.create({
            ministryId,
            name,
            behaviorType: behaviorType as any,
        });

        return this.dutyRepo.save(duty);
    }
}
