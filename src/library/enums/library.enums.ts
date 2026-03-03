export enum BookOwnershipType {
  CHURCH = 'CHURCH',
  MEMBER = 'MEMBER',
}

/**
 * Book availability state machine:
 * AVAILABLE → RESERVED (on loan approval) → LOANED (on physical delivery) → AVAILABLE (on return)
 * REMOVED: permanently withdrawn, no new loans possible.
 */
export enum BookStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',  // Approved loan, not yet physically delivered
  LOANED = 'LOANED',      // Physically delivered to borrower
  REMOVED = 'REMOVED',    // Withdrawn from circulation
}

/**
 * Loan lifecycle state machine:
 * REQUESTED → APPROVED → DELIVERED → RETURNED
 *           ↘ REJECTED (by approver)
 * REQUESTED → CANCELLED (by requester, before approval)
 */
export enum LoanStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}
