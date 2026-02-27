import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Family } from '../entities/family.entity';

@Injectable()
export class DeleteFamilyUseCase {
    constructor(
        private readonly dataSource: DataSource
    ) { }

    async execute(id: string): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            const familyRepo = manager.getRepository(Family);

            const family = await familyRepo.findOne({ where: { id } });
            if (!family) {
                throw new NotFoundException('Family not found');
            }

            // Deleting family will cascade delete members due to Entity configuration.
            // But doing it inside transaction ensures atomicity.
            // We could also manually delete members if needed for specific logic, 
            // but Cascade is defined in entity: onDelete: 'CASCADE'.
            await familyRepo.remove(family);
        });
    }
}
