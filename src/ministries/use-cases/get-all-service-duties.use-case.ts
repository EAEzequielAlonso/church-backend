import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceDuty } from '../entities/service-duty.entity';

@Injectable()
export class GetAllServiceDutiesUseCase {
    constructor(
        @InjectRepository(ServiceDuty)
        private readonly dutyRepo: Repository<ServiceDuty>,
    ) { }

    async execute(churchId: string): Promise<ServiceDuty[]> {
        return this.dutyRepo.find({
            where: { ministry: { churchId } },
            relations: ['ministry'],
        });
    }
}
