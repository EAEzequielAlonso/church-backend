import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Family } from '../entities/family.entity';
import { UpdateFamilyDto } from '../dto/update-family.dto';
import { FamilyPolicy } from '../policies/family.policy';

@Injectable()
export class UpdateFamilyUseCase {
    constructor(
        private readonly dataSource: DataSource,
        private readonly policy: FamilyPolicy
    ) { }

    async execute(id: string, updateDto: UpdateFamilyDto): Promise<Family> {
        return this.dataSource.transaction(async (manager) => {
            const familyRepo = manager.getRepository(Family);

            const family = await familyRepo.findOne({
                where: { id },
                relations: ['church']
            });
            if (!family) {
                throw new NotFoundException('Family not found');
            }

            // Apply updates
            Object.assign(family, updateDto);

            // Validate state
            this.policy.ensureValidFamilyState(family);

            return familyRepo.save(family);
        });
    }
}
