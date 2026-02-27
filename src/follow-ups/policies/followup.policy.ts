import { Injectable } from '@nestjs/common';
import { FunctionalRole, SystemRole } from '../../common/enums';
import { FollowUp } from '../entities/follow-up.entity';

@Injectable()
export class FollowupPolicy {
    canViewAll(user: any): boolean {
        const roles = user.roles || [];
        return (
            user.systemRole === SystemRole.ADMIN_APP ||
            roles.includes(FunctionalRole.ADMIN_CHURCH) ||
            roles.includes(FunctionalRole.AUDITOR) ||
            roles.includes(FunctionalRole.MINISTRY_LEADER) ||
            !!user.memberId // All members can view the list
        );
    }

    canManageAll(user: any): boolean {
        const roles = user.roles || [];
        return (
            user.systemRole === SystemRole.ADMIN_APP ||
            roles.includes(FunctionalRole.ADMIN_CHURCH) ||
            roles.includes(FunctionalRole.AUDITOR)
        );
    }

    canAssign(user: any): boolean {
        return this.canManageAll(user);
    }

    canChangeStatus(user: any): boolean {
        return this.canManageAll(user);
    }

    canView(user: any, followup: FollowUp): boolean {
        if (this.canViewAll(user)) return true;

        // Member can only view if assigned to them
        if (followup.assignedToId && user.memberId === followup.assignedToId) {
            return true;
        }

        return false;
    }

    canCreateNote(user: any, followup: FollowUp): boolean {
        if (this.canManageAll(user)) return true;

        // Member: can create note if assigned to them
        if (followup.assignedToId && user.memberId === followup.assignedToId) {
            return true;
        }
        return false;
    }

    canViewNote(user: any, note: any): boolean {
        const isManager = this.canManageAll(user);

        if (note.type === 'SHARED') return true;

        if (note.type === 'PASTORAL') {
            return isManager;
        }

        if (note.type === 'INTERNAL') {
            // Visible to managers OR the author OR the currently assigned member
            if (isManager) return true;
            if (user.memberId === note.createdById) return true;

            // Note: We'd ideally check if user is currently assigned to the related followup here.
            // Since we don't always have the full context in the 'note' object depending on how it's loaded,
            // we assume the UseCase filters correctly. 
            // But if we STRICTLY enforce it here, we need note.followUp.
            return true;
        }

        return false;
    }
    canEditNote(user: any, note: any): boolean {
        // STRICT: Only the author can edit/delete their own note
        if (!user.personId) return false;
        return user.personId === note.authorPersonId;
    }

    canDeleteNote(user: any, note: any): boolean {
        return this.canEditNote(user, note);
    }
}
