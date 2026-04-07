/**
 * Multi-Currency Validation Tests
 *
 * Uses isolated mocking to avoid NestJS entity circular dependency chains.
 * Tests the business logic of CreateTransactionUseCase and CorrectTransactionUseCase.
 */

// ── Mock ALL entity modules to avoid circular dependency chains ──
jest.mock('../../churches/entities/church.entity', () => ({
    Church: class Church {
        id: string;
        name: string;
        baseCurrency: string;
    },
}));
jest.mock('../entities/account.entity', () => ({
    Account: class Account {
        id: string;
        name: string;
        type: string;
        currency: string;
        balance: number;
        churchId: string;
        church: any;
    },
}));
jest.mock('../entities/treasury-transaction.entity', () => ({
    TreasuryTransaction: class TreasuryTransaction { },
}));
jest.mock('../entities/transaction-category.entity', () => ({
    TransactionCategory: class TransactionCategory { },
}));
jest.mock('../entities/treasury-audit-log.entity', () => ({
    TreasuryAuditLog: class TreasuryAuditLog { },
}));
jest.mock('../entities/closed-period.entity', () => ({
    ClosedPeriod: class ClosedPeriod { },
}));


import { BadRequestException } from '@nestjs/common';
import { CreateTransactionUseCase } from '../use-cases/create-transaction.use-case';
import { CorrectTransactionUseCase } from '../use-cases/correct-transaction.use-case';
import { TreasuryPolicy } from '../policies/treasury.policy';
import { Church } from '../../churches/entities/church.entity';
import { Account } from '../entities/account.entity';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { TransactionCategory } from '../entities/transaction-category.entity';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import {
    Currency,
    TransactionType,
    TransactionStatus,
    AccountType,
} from '../enums/treasury.enums';
import { DataSource } from 'typeorm';
import { ClosedPeriod } from '../entities/closed-period.entity';


// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeAccount(id: string, currency: Currency, balance = 0): any {
    return {
        id,
        name: `Account ${id}`,
        type: AccountType.ASSET,
        currency,
        balance,
        churchId: 'church-1'
    };
}

function makeChurch(baseCurrency = Currency.ARS): any {
    return { id: 'church-1', name: 'Test Church', baseCurrency };
}

function makeCategory(id: string, type: TransactionType): any {
    return { id, name: `Category ${id}`, type, color: '#000' };
}

function buildMockDS(opts: {
    church: any;
    accounts: Map<string, any>;
    categories?: Map<string, any>;
    originalTx?: any;
}): DataSource {
    const makeRepo = (entity: any) => {
        if (entity === Church) {
            return { findOne: jest.fn().mockResolvedValue(opts.church) };
        }
        if (entity === Account) {
            return {
                findOne: jest.fn().mockImplementation(({ where }: any) =>
                    Promise.resolve(opts.accounts.get(where.id) || null),
                ),
                save: jest.fn().mockImplementation((a: any) => Promise.resolve(a)),
            };
        }
        if (entity === TransactionCategory) {
            return {
                findOne: jest.fn().mockImplementation(({ where }: any) =>
                    Promise.resolve(opts.categories?.get(where.id) || null),
                ),
            };
        }
        if (entity === TreasuryTransaction) {
            return {
                findOne: jest.fn().mockResolvedValue(opts.originalTx || null),
                create: jest.fn().mockImplementation((d: any) => ({ ...d })),
                save: jest.fn().mockImplementation((t: any) => {
                    t.id = t.id || `tx-${Date.now()}`;
                    return Promise.resolve(t);
                }),
            };
        }
        if (entity === TreasuryAuditLog) {
            return {
                create: jest.fn().mockImplementation((d: any) => d),
                save: jest.fn().mockResolvedValue({}),
            };
        }
        if (entity === ClosedPeriod) {
            return {
                findOne: jest.fn().mockResolvedValue(null), // Period is open
            };
        }

        return {};
    };

    return {
        transaction: jest.fn().mockImplementation(async (cb: any) => {
            return cb({ getRepository: jest.fn(makeRepo) });
        }),
    } as unknown as DataSource;
}

// ═════════════════════════════════════════════════════════════════════════════

describe('Multi-Currency Validation', () => {
    let policy: TreasuryPolicy;
    const CAT_INCOME = makeCategory('cat-income', TransactionType.INCOME);
    const CAT_EXPENSE = makeCategory('cat-expense', TransactionType.EXPENSE);

    beforeEach(() => {
        policy = new TreasuryPolicy();
    });

    // ── Income USD con base ARS ────────────────────────────────────────────

    describe('Income USD con base ARS', () => {
        it('should calculate amountBaseCurrency = amount × exchangeRate', async () => {
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([['acc-usd', makeAccount('acc-usd', Currency.USD, 1000)]]),
                categories: new Map([['cat-income', CAT_INCOME]]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            const result = await uc.execute({
                type: TransactionType.INCOME,
                amount: 100,
                currency: Currency.USD,
                exchangeRate: 1150,
                description: 'USD donation',
                destinationAccountId: 'acc-usd',
                categoryId: 'cat-income',
                churchId: 'church-1',
                userId: 'user-1',
            });

            expect(result.amountBaseCurrency).toBe(115000);
            expect(result.currency).toBe(Currency.USD);
            expect(result.exchangeRate).toBe(1150);
        });

        it('should reject without exchangeRate when currency ≠ baseCurrency', async () => {
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([['acc-usd', makeAccount('acc-usd', Currency.USD)]]),
                categories: new Map([['cat-income', CAT_INCOME]]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            await expect(
                uc.execute({
                    type: TransactionType.INCOME,
                    amount: 100,
                    currency: Currency.USD,
                    description: 'Missing rate',
                    destinationAccountId: 'acc-usd',
                    categoryId: 'cat-income',
                    churchId: 'church-1',
                    userId: 'user-1',
                }),
            ).rejects.toThrow('tipo de cambio');
        });

        it('should reject when tx.currency ≠ account.currency', async () => {
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([['acc-ars', makeAccount('acc-ars', Currency.ARS)]]),
                categories: new Map([['cat-income', CAT_INCOME]]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            await expect(
                uc.execute({
                    type: TransactionType.INCOME,
                    amount: 100,
                    currency: Currency.USD,
                    exchangeRate: 1150,
                    description: 'Currency mismatch',
                    destinationAccountId: 'acc-ars',
                    categoryId: 'cat-income',
                    churchId: 'church-1',
                    userId: 'user-1',
                }),
            ).rejects.toThrow('no coincide');
        });
    });

    // ── Expense USD con base ARS ───────────────────────────────────────────

    describe('Expense USD con base ARS', () => {
        it('should debit USD account and calculate base amount', async () => {
            const usdAcc = makeAccount('acc-usd', Currency.USD, 1000);
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([['acc-usd', usdAcc]]),
                categories: new Map([['cat-expense', CAT_EXPENSE]]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            const result = await uc.execute({
                type: TransactionType.EXPENSE,
                amount: 50,
                currency: Currency.USD,
                exchangeRate: 1150,
                description: 'USD payment',
                sourceAccountId: 'acc-usd',
                categoryId: 'cat-expense',
                churchId: 'church-1',
                userId: 'user-1',
            });

            expect(result.amountBaseCurrency).toBe(57500);
            expect(usdAcc.balance).toBe(950);
        });

        it('should force exchangeRate=1 when txCurrency === baseCurrency', async () => {
            const arsAcc = makeAccount('acc-ars', Currency.ARS, 10000);
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([['acc-ars', arsAcc]]),
                categories: new Map([['cat-expense', CAT_EXPENSE]]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            const result = await uc.execute({
                type: TransactionType.EXPENSE,
                amount: 500,
                currency: Currency.ARS,
                exchangeRate: 999, // forced to 1
                description: 'ARS payment',
                sourceAccountId: 'acc-ars',
                categoryId: 'cat-expense',
                churchId: 'church-1',
                userId: 'user-1',
            });

            expect(result.exchangeRate).toBe(1);
            expect(result.amountBaseCurrency).toBe(500);
        });
    });

    // ── Transfer USD→ARS ───────────────────────────────────────────────────

    describe('Transfer USD→ARS', () => {
        it('should transfer cross-currency: debit USD, credit ARS×rate', async () => {
            const usdAcc = makeAccount('acc-usd', Currency.USD, 1000);
            const arsAcc = makeAccount('acc-ars', Currency.ARS, 50000);
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([
                    ['acc-usd', usdAcc],
                    ['acc-ars', arsAcc],
                ]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            const result = await uc.execute({
                type: TransactionType.TRANSFER,
                amount: 100,
                currency: Currency.USD,
                exchangeRate: 1150,
                description: 'USD→ARS',
                sourceAccountId: 'acc-usd',
                destinationAccountId: 'acc-ars',
                churchId: 'church-1',
                userId: 'user-1',
            });

            expect(result.amountBaseCurrency).toBe(115000);
            expect(usdAcc.balance).toBe(900);
            expect(arsAcc.balance).toBe(165000); // 50000 + 100×1150
        });

        it('should reject cross-currency transfer without exchangeRate', async () => {
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([
                    ['acc-usd', makeAccount('acc-usd', Currency.USD, 1000)],
                    ['acc-ars', makeAccount('acc-ars', Currency.ARS, 50000)],
                ]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            await expect(
                uc.execute({
                    type: TransactionType.TRANSFER,
                    amount: 100,
                    currency: Currency.USD,
                    description: 'No rate',
                    sourceAccountId: 'acc-usd',
                    destinationAccountId: 'acc-ars',
                    churchId: 'church-1',
                    userId: 'user-1',
                }),
            ).rejects.toThrow('tipo de cambio');
        });

        it('should reject when tx.currency ≠ source.currency', async () => {
            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([
                    ['acc-ars', makeAccount('acc-ars', Currency.ARS, 50000)],
                    ['acc-usd', makeAccount('acc-usd', Currency.USD, 1000)],
                ]),
            });
            const uc = new CreateTransactionUseCase(ds, policy);

            await expect(
                uc.execute({
                    type: TransactionType.TRANSFER,
                    amount: 100,
                    currency: Currency.USD, // ≠ source ARS
                    exchangeRate: 1150,
                    description: 'Wrong source',
                    sourceAccountId: 'acc-ars',
                    destinationAccountId: 'acc-usd',
                    churchId: 'church-1',
                    userId: 'user-1',
                }),
            ).rejects.toThrow('debe coincidir');
        });
    });

    // ── Correction cross-currency ──────────────────────────────────────────

    describe('Correction cross-currency', () => {
        it('should reject new account with different currency', async () => {
            const usdAcc = makeAccount('acc-usd', Currency.USD, 1000);
            const arsAcc = makeAccount('acc-ars', Currency.ARS, 50000);

            const originalTx = {
                id: 'tx-orig',
                amount: 100,
                amountBaseCurrency: 115000,
                currency: Currency.USD,
                exchangeRate: 1150,
                type: TransactionType.INCOME,
                status: TransactionStatus.COMPLETED,
                sourceAccount: null,
                destinationAccount: usdAcc,
                category: null,
                ministry: null,
                description: 'USD donation',
                churchId: 'church-1',
            };

            const ds = buildMockDS({
                church: makeChurch(Currency.ARS),
                accounts: new Map([
                    ['acc-usd', usdAcc],
                    ['acc-ars', arsAcc],
                ]),
                originalTx,
            });

            const uc = new CorrectTransactionUseCase(ds, policy);

            await expect(
                uc.execute({
                    transactionId: 'tx-orig',
                    churchId: 'church-1',
                    userId: 'user-1',
                    reason: 'Wrong account',
                    newDestinationAccountId: 'acc-ars', // ARS ≠ tx USD
                }),
            ).rejects.toThrow('no coincide');
        });
    });
});
