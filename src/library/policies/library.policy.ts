import {
    Injectable,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { Book } from '../entities/book.entity';
import { Loan } from '../entities/loan.entity';
import { BookOwnershipType, BookStatus, LoanStatus } from '../enums/library.enums';
import { FunctionalRole } from '../../common/enums';

@Injectable()
export class LibraryPolicy {

    // ─── Helpers ───────────────────────────────────────────────────────────────

    isLibrarian(roles: string[]): boolean {
        return roles.includes(FunctionalRole.LIBRARIAN);
    }

    isMemberBookOwner(book: Book, memberId: string): boolean {
        return (
            book.ownershipType === BookOwnershipType.MEMBER &&
            book.ownerMemberId === memberId
        );
    }

    // ─── Book Permissions ──────────────────────────────────────────────────────

    /**
     * CHURCH books → caller must be LIBRARIAN.
     * MEMBER books → caller must have a valid memberId.
     */
    assertCanCreateBook(
        ownershipType: BookOwnershipType,
        roles: string[],
        memberId: string | null,
    ): void {
        if (ownershipType === BookOwnershipType.CHURCH) {
            if (!this.isLibrarian(roles)) {
                throw new ForbiddenException(
                    'Solo el BIBLIOTECARIO puede registrar libros institucionales',
                );
            }
        } else {
            if (!memberId) {
                throw new BadRequestException(
                    'Se requiere membresía activa para registrar libros personales',
                );
            }
        }
    }

    /**
     * CHURCH books → must be LIBRARIAN.
     * MEMBER books → must be owner OR librarian.
     */
    assertCanEditBook(book: Book, roles: string[], memberId: string): void {
        if (book.ownershipType === BookOwnershipType.CHURCH) {
            if (!this.isLibrarian(roles)) {
                throw new ForbiddenException(
                    'Solo el BIBLIOTECARIO puede editar libros institucionales',
                );
            }
        } else {
            if (!this.isLibrarian(roles) && !this.isMemberBookOwner(book, memberId)) {
                throw new ForbiddenException(
                    'Solo el dueño o el BIBLIOTECARIO puede editar este libro',
                );
            }
        }
    }

    /**
     * CHURCH books → must be LIBRARIAN.
     * MEMBER books → must be owner OR librarian.
     * Must not have an active loan.
     */
    assertCanDeleteBook(book: Book, roles: string[], memberId: string): void {
        if (book.ownershipType === BookOwnershipType.CHURCH) {
            if (!this.isLibrarian(roles)) {
                throw new ForbiddenException(
                    'Solo el BIBLIOTECARIO puede retirar libros institucionales',
                );
            }
        } else {
            if (!this.isLibrarian(roles) && !this.isMemberBookOwner(book, memberId)) {
                throw new ForbiddenException(
                    'Solo el dueño o el BIBLIOTECARIO puede retirar este libro',
                );
            }
        }

        if (book.status === BookStatus.LOANED || book.status === BookStatus.RESERVED) {
            throw new BadRequestException(
                'No se puede retirar un libro con un préstamo activo',
            );
        }
    }

    /**
     * Validates ownership consistency.
     * MEMBER → ownerMemberId must be provided.
     * CHURCH → ownerMemberId must be null.
     */
    assertOwnershipConsistency(
        ownershipType: BookOwnershipType,
        ownerMemberId: string | null | undefined,
    ): void {
        if (ownershipType === BookOwnershipType.MEMBER && !ownerMemberId) {
            throw new BadRequestException(
                'Un libro personal requiere ownerMemberId',
            );
        }
        if (ownershipType === BookOwnershipType.CHURCH && ownerMemberId) {
            throw new BadRequestException(
                'Un libro institucional no puede tener ownerMemberId',
            );
        }
    }

    // ─── Loan Permissions ─────────────────────────────────────────────────────

    /**
     * Asserts who can APPROVE a loan request.
     * CHURCH books → LIBRARIAN only.
     * MEMBER books → the ownerMember only.
     */
    assertCanApproveLoan(
        loan: Loan & { book: Book },
        roles: string[],
        memberId: string,
    ): void {
        if (loan.status !== LoanStatus.REQUESTED) {
            throw new BadRequestException(
                `La solicitud debe estar en estado REQUESTED para aprobarla (actual: ${loan.status})`,
            );
        }
        if (loan.book.status !== BookStatus.AVAILABLE) {
            throw new BadRequestException(
                'El libro ya no está disponible para préstamo',
            );
        }

        if (loan.book.ownershipType === BookOwnershipType.CHURCH) {
            if (!this.isLibrarian(roles)) {
                throw new ForbiddenException(
                    'Solo el BIBLIOTECARIO puede aprobar préstamos de libros institucionales',
                );
            }
        } else {
            // MEMBER book — only the owner approves
            if (loan.book.ownerMemberId !== memberId) {
                throw new ForbiddenException(
                    'Solo el dueño del libro puede aprobar este préstamo',
                );
            }
        }
    }

    /**
     * Asserts that the loan is in APPROVED state before delivery.
     * Any LIBRARIAN or book owner can register delivery.
     */
    assertCanDeliverLoan(
        loan: Loan & { book: Book },
        roles: string[],
        memberId: string,
    ): void {
        if (loan.status !== LoanStatus.APPROVED) {
            throw new BadRequestException(
                `El préstamo debe estar APROBADO antes de registrar la entrega (actual: ${loan.status})`,
            );
        }
        if (loan.book.status !== BookStatus.RESERVED) {
            throw new BadRequestException(
                'El libro debe estar en estado RESERVED antes de registrar entrega',
            );
        }

        if (loan.book.ownershipType === BookOwnershipType.CHURCH) {
            if (!this.isLibrarian(roles)) {
                throw new ForbiddenException(
                    'Solo el BIBLIOTECARIO puede registrar la entrega de libros institucionales',
                );
            }
        } else {
            if (!this.isLibrarian(roles) && loan.book.ownerMemberId !== memberId) {
                throw new ForbiddenException(
                    'Solo el dueño o el BIBLIOTECARIO puede registrar la entrega',
                );
            }
        }
    }

    /**
     * Asserts who can CONFIRM a loan return.
     * CHURCH books → LIBRARIAN only.
     * MEMBER books → owner or LIBRARIAN.
     */
    assertCanReturnLoan(
        loan: Loan & { book: Book },
        roles: string[],
        memberId: string,
    ): void {
        if (loan.status !== LoanStatus.DELIVERED) {
            throw new BadRequestException(
                `Solo se puede devolver un préstamo ENTREGADO (actual: ${loan.status})`,
            );
        }

        if (loan.book.ownershipType === BookOwnershipType.CHURCH) {
            if (!this.isLibrarian(roles)) {
                throw new ForbiddenException(
                    'Solo el BIBLIOTECARIO puede confirmar la devolución de libros institucionales',
                );
            }
        } else {
            if (!this.isLibrarian(roles) && loan.book.ownerMemberId !== memberId) {
                throw new ForbiddenException(
                    'Solo el dueño del libro o el BIBLIOTECARIO puede confirmar la devolución',
                );
            }
        }
    }

    /**
     * Asserts who can REJECT a loan request.
     * CHURCH books → LIBRARIAN only.
     * MEMBER books → owner only.
     * Only when status = REQUESTED.
     */
    assertCanRejectLoan(
        loan: Loan & { book: Book },
        roles: string[],
        memberId: string,
    ): void {
        if (loan.status !== LoanStatus.REQUESTED) {
            throw new BadRequestException(
                `Solo se puede rechazar una solicitud PENDIENTE (actual: ${loan.status})`,
            );
        }

        if (loan.book.ownershipType === BookOwnershipType.CHURCH) {
            if (!this.isLibrarian(roles)) {
                throw new ForbiddenException(
                    'Solo el BIBLIOTECARIO puede rechazar solicitudes de libros institucionales',
                );
            }
        } else {
            if (loan.book.ownerMemberId !== memberId) {
                throw new ForbiddenException(
                    'Solo el dueño del libro puede rechazar este préstamo',
                );
            }
        }
    }

    /**
     * Asserts who can CANCEL a loan request.
     * Only the borrower can cancel.
     * Only when status = REQUESTED.
     */
    assertCanCancelLoan(loan: Loan, borrowerMemberId: string): void {
        if (loan.status !== LoanStatus.REQUESTED) {
            throw new BadRequestException(
                `Solo se puede cancelar una solicitud PENDIENTE (actual: ${loan.status})`,
            );
        }
        if (loan.borrowerId !== borrowerMemberId) {
            throw new ForbiddenException(
                'Solo el solicitante puede cancelar su propio pedido',
            );
        }
    }
}
