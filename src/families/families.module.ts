import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamiliesController } from './families.controller';
import { Family } from './entities/family.entity';
import { FamilyMember } from './entities/family-member.entity';
import { FamilyPolicy } from './policies/family.policy';
import { MembersModule } from '../members/members.module';

// Use Cases
import { CreateFamilyUseCase } from './use-cases/create-family.use-case';
import { UpdateFamilyUseCase } from './use-cases/update-family.use-case';
import { DeleteFamilyUseCase } from './use-cases/delete-family.use-case';
import { GetFamilyUseCase } from './use-cases/get-family.use-case';
import { ListFamiliesUseCase } from './use-cases/list-families.use-case';
import { AddFamilyMemberUseCase } from './use-cases/add-family-member.use-case';
import { RemoveFamilyMemberUseCase } from './use-cases/remove-family-member.use-case';

@Module({
    imports: [
        TypeOrmModule.forFeature([Family, FamilyMember]),
        MembersModule
    ],
    controllers: [FamiliesController],
    providers: [
        FamilyPolicy,
        CreateFamilyUseCase,
        UpdateFamilyUseCase,
        DeleteFamilyUseCase,
        GetFamilyUseCase,
        ListFamiliesUseCase,
        AddFamilyMemberUseCase,
        RemoveFamilyMemberUseCase
    ],
    exports: [
        GetFamilyUseCase // Export if needed by other modules
    ]
})
export class FamiliesModule { }
