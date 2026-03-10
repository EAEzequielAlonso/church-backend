import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ministry } from '../entities/ministry.entity';

@Injectable()
export class GetMinistriesUseCase {
    constructor(
        @InjectRepository(Ministry)
        private readonly ministryRepo: Repository<Ministry>,
    ) { }

    async execute(churchId: string): Promise<Ministry[]> {
        return this.ministryRepo.find({
            where: { churchId },
            relations: [
                'leader',
                'leader.person',
                'members',
                'members.member.person',
            ],
            order: { name: 'ASC' },
        });
    }
}
