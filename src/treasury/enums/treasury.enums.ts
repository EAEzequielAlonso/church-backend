
export enum Currency {
    ARS = 'ARS',
    USD = 'USD',
    EUR = 'EUR',
    BRL = 'BRL',
    CLP = 'CLP',
    MXN = 'MXN',
}

export enum AccountType {
    ASSET = 'asset',
    LIABILITY = 'liability',
    EQUITY = 'equity'
}

export enum TransactionType {
    INCOME = 'income',
    EXPENSE = 'expense',
    TRANSFER = 'transfer'
}

export enum TransactionStatus {
    COMPLETED = 'completed',
    PENDING_APPROVAL = 'pending_approval',
    REJECTED = 'rejected'
}
