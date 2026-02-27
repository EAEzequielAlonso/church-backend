export enum BookOwnershipType {
    CHURCH = 'CHURCH',
    MEMBER = 'MEMBER',
}

export enum BookStatus {
    AVAILABLE = 'AVAILABLE', // Computed: No active loans
    LOANED = 'LOANED',       // Computed: Has active loan (APPROVED/DELIVERED)
    REMOVED = 'REMOVED',     // Soft deleted or manually set
}

export enum LoanStatus {
    REQUESTED = 'REQUESTED',
    APPROVED = 'APPROVED',
    DELIVERED = 'DELIVERED', // Active loan
    RETURNED = 'RETURNED',   // Completed
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED',
    ACTIVE = 'ACTIVE', // Deprecated: Used for legacy data migration
}
