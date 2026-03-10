import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceDuty } from '../entities/service-duty.entity';

@Injectable()
export class GetServiceDutiesUseCase {
    constructor(
        @InjectRepository(ServiceDuty)
        private readonly dutyRepo: Repository<ServiceDuty>,
    ) { }

    async execute(ministryId: string): Promise<ServiceDuty[]> {
        return this.dutyRepo.find({
            where: { ministryId },
            order: { name: 'ASC' },
        });
    }
}
