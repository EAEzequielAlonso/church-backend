import { Injectable, BadRequestException } from '@nestjs/common';
import { Family } from '../entities/family.entity';
import { FamilyMember } from '../entities/family-member.entity';
import { FamilyRole } from '../../common/enums';

@Injectable()
export class FamilyPolicy {
    /**
     * Ensures consistent state for a family.
     * Validates domain rules (e.g. name length, church association).
     */
    ensureValidFamilyState(family: Partial<Family>) {
        if (!family.name || family.name.trim().length < 2) {
            throw new BadRequestException('El nombre de la familia debe tener al menos 2 caracteres.');
        }
        if (!family.church) {
            throw new BadRequestException('La familia debe pertenecer a una iglesia.');
        }
    }

    /**
     * Validates that a member can be added to a family.
     * Domain Rule: One "HEAD" per family? Or logic regarding duplicate members.
     * (We check duplicate via Unique Index, but policy can pre-validate).
     */
    ensureCanAddMember(family: Family, memberId: string) {
        if (family.members && family.members.some(m => m.member.id === memberId)) {
            throw new BadRequestException('El miembro ya pertenece a esta familia.');
        }
    }

    ensureValidRole(role: string) {
        if (!Object.values(FamilyRole).includes(role as FamilyRole)) {
            throw new BadRequestException('Rol familiar inválido.');
        }
    }
}
