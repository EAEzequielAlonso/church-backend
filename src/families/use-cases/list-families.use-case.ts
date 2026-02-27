import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../entities/family.entity';

@Injectable()
export class ListFamiliesUseCase {
    constructor(
        @InjectRepository(Family)
        private readonly familyRepository: Repository<Family>
    ) { }

    async execute(churchId: string): Promise<Family[]> {
        return this.familyRepository.createQueryBuilder('family')
            .leftJoinAndSelect('family.members', 'members')
            .leftJoinAndSelect('members.member', 'member')
            .leftJoinAndSelect('member.person', 'person')
            .where('family.church.id = :churchId', { churchId })
            .getMany();
    }
}
