import { Injectable, ForbiddenException } from '@nestjs/common';
import { FunctionalRole } from '../../common/enums';
import { InventoryItem } from '../entities/inventory-item.entity';

@Injectable()
export class InventoryPolicy {

    // ─── Helpers ───────────────────────────────────────────────────────────────

    isMinistryLeader(roles: string[]): boolean {
        return roles.includes(FunctionalRole.MINISTRY_LEADER);
    }

    isAdminChurch(roles: string[]): boolean {
        return roles.includes(FunctionalRole.ADMIN_CHURCH);
    }

    /** Both MINISTRY_LEADER and ADMIN_CHURCH can manage inventory */
    canManageInventory(roles: string[]): boolean {
        return this.isMinistryLeader(roles) || this.isAdminChurch(roles);
    }

    // ─── Item Permissions ──────────────────────────────────────────────────────

    /**
     * Only MINISTRY_LEADER or ADMIN_CHURCH can create items.
     */
    assertCanCreateItem(roles: string[]): void {
        if (!this.canManageInventory(roles)) {
            throw new ForbiddenException(
                'Solo el LÍDER DE MINISTERIO o el ADMINISTRADOR pueden registrar ítems de inventario',
            );
        }
    }

    /**
     * Only MINISTRY_LEADER or ADMIN_CHURCH can update items.
     */
    assertCanUpdateItem(roles: string[]): void {
        if (!this.canManageInventory(roles)) {
            throw new ForbiddenException(
                'Solo el LÍDER DE MINISTERIO o el ADMINISTRADOR pueden modificar ítems de inventario',
            );
        }
    }

    /**
     * Only MINISTRY_LEADER or ADMIN_CHURCH can deactivate items.
     */
    assertCanDeactivateItem(roles: string[]): void {
        if (!this.canManageInventory(roles)) {
            throw new ForbiddenException(
                'Solo el LÍDER DE MINISTERIO o el ADMINISTRADOR pueden desactivar ítems',
            );
        }
    }

    /**
     * Only MINISTRY_LEADER or ADMIN_CHURCH can hard-delete items.
     */
    assertCanDeleteItem(roles: string[]): void {
        if (!this.canManageInventory(roles)) {
            throw new ForbiddenException(
                'Solo el LÍDER DE MINISTERIO o el ADMINISTRADOR pueden eliminar ítems de inventario',
            );
        }
    }

    // ─── Movement Permissions ──────────────────────────────────────────────────

    /**
     * Movement registration requires MINISTRY_LEADER or ADMIN_CHURCH.
     * Also validates that the item belongs to the caller's church (multi-tenancy).
     */
    assertCanRegisterMovement(
        item: InventoryItem,
        churchId: string,
        roles: string[],
    ): void {
        if (!this.canManageInventory(roles)) {
            throw new ForbiddenException(
                'Solo el LÍDER DE MINISTERIO o el ADMINISTRADOR pueden registrar movimientos',
            );
        }
        if (item.churchId !== churchId) {
            throw new ForbiddenException(
                'El ítem no pertenece a esta iglesia',
            );
        }
    }
}
