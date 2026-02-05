import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { SmallGroup } from '../entities/small-group.entity';
import { SmallGroupStatus } from '../../common/enums';

@Injectable()
export class SmallGroupPolicy {

    /**
     * Ensures the user is a moderator/leader of the group.
     * This is a contextual domain constraint (Ownership).
     */
    ensureUserIsGroupLeader(user: any, group: SmallGroup): void {
        const isLeader = group.members?.some(m =>
            m.member.id === user.memberId && m.role === 'MODERATOR'
        );

        if (!isLeader) {
            throw new UnauthorizedException('Solo el encargado puede realizar esta acción en este grupo');
        }
    }

    /**
     * Ensures the group is in a state that allows modification of content.
     */
    ensureGroupIsNotFinished(group: SmallGroup): void {
        if (group.status === SmallGroupStatus.FINISHED) {
            throw new BadRequestException('No se puede modificar un grupo finalizado');
        }
    }

    /**
     * Ensures the group status transition is valid.
     */
    ensureValidStatusTransition(group: SmallGroup, newStatus: SmallGroupStatus): void {
        if (group.status === SmallGroupStatus.FINISHED && newStatus !== SmallGroupStatus.ACTIVE) {
            // Strict rule: Finished groups are read-only unless reactivated.
            throw new BadRequestException('Un grupo finalizado solo puede modificarse si se reactiva.');
        }
    }
}
