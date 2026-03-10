import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { Account } from '../entities/account.entity';
import { ClosedPeriod } from '../entities/closed-period.entity';

/**
 * Creates a flat JSON snapshot of a TreasuryTransaction.
 * No nested relations — only IDs.
 */
export function snapshotTransaction(tx: any): Record<string, any> {
    return {
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount),
        currency: tx.currency,
        exchangeRate: Number(tx.exchangeRate || 1),
        amountBaseCurrency: Number(tx.amountBaseCurrency || 0),
        sourceAccountId: tx.sourceAccount?.id || tx.sourceAccountId || null,
        destinationAccountId:
            tx.destinationAccount?.id || tx.destinationAccountId || null,
        categoryId: tx.category?.id || tx.categoryId || null,
        ministryId: tx.ministry?.id || tx.ministryId || null,
        description: tx.description,
        status: tx.status,
        isCorrection: tx.isCorrection || false,
        correctedTransactionId: tx.correctedTransactionId || null,
        date: tx.date,
    };
}

/**
 * Creates a flat JSON snapshot of an Account.
 */
export function snapshotAccount(acc: any): Record<string, any> {
    return {
        id: acc.id,
        name: acc.name,
        currency: acc.currency,
        type: acc.type,
        balance: Number(acc.balance),
    };
}

/**
 * Creates a flat JSON snapshot of a ClosedPeriod.
 */
export function snapshotPeriod(p: any): Record<string, any> {
    return {
        id: p.id,
        year: p.year,
        month: p.month,
        isClosed: p.isClosed,
        totalIncome: Number(p.totalIncome || 0),
        totalExpense: Number(p.totalExpense || 0),
        netResult: Number(p.netResult || 0),
        closedById: p.closedById,
    };
}
