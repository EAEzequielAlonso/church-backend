import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceDuty } from '../entities/service-duty.entity';
import { MinistryPolicy } from '../policies/ministry.policy';
import { SystemRole, FunctionalRole } from '../../common/enums';

@Injectable()
export class UpdateServiceDutyUseCase {
    constructor(
        @InjectRepository(ServiceDuty)
        private readonly dutyRepo: Repository<ServiceDuty>,
        private readonly ministryPolicy: MinistryPolicy,
    ) { }

    async execute(
        ministryId: string,
        dutyId: string,
        name: string,
        behaviorType: string,
        churchId: string,
        requestPersonId: string,
        systemRole: SystemRole,
        functionalRole: FunctionalRole
    ): Promise<ServiceDuty> {

        await this.ministryPolicy.assertCanManage(ministryId, requestPersonId, churchId, systemRole, functionalRole);

        const duty = await this.dutyRepo.findOne({
            where: { id: dutyId, ministryId }
        });

        if (!duty) {
            throw new NotFoundException('Rol de culto no encontrado');
        }

        duty.name = name;
        duty.behaviorType = behaviorType as any;

        return this.dutyRepo.save(duty);
    }
}
