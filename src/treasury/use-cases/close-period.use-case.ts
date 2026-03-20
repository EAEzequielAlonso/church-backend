import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClosedPeriod } from '../entities/closed-period.entity';
import { PeriodAccountSnapshot } from '../entities/period-account-snapshot.entity';
import { Account } from '../entities/account.entity';
import { TreasuryTransaction } from '../entities/treasury-transaction.entity';
import { Church } from '../../churches/entities/church.entity';
import { TransactionStatus, AuditEntityType, AuditAction } from '../enums/treasury.enums';
import { TreasuryAuditLog } from '../entities/treasury-audit-log.entity';
import { snapshotPeriod } from '../helpers/audit-snapshot.helper';

export interface ClosePeriodDto {
    churchId: string;
    userId: string;
    userRole?: string;
    userEmail?: string;
    ipAddress?: string;
    year: number;
    month: number; // 1-12
}

@Injectable()
export class ClosePeriodUseCase {
    constructor(private readonly dataSource: DataSource) { }

    async execute(dto: ClosePeriodDto): Promise<ClosedPeriod> {
        if (dto.month < 1 || dto.month > 12)
            throw new BadRequestException('Mes inválido (1-12).');
        if (dto.year < 2000 || dto.year > 2100)
            throw new BadRequestException('Año inválido.');

        return this.dataSource.transaction(async (manager) => {
            const periodRepo = manager.getRepository(ClosedPeriod);
            const snapshotRepo = manager.getRepository(PeriodAccountSnapshot);
            const accountRepo = manager.getRepository(Account);
            const txRepo = manager.getRepository(TreasuryTransaction);
            const churchRepo = manager.getRepository(Church);

            // 0. Load church for baseCurrency
            const church = await churchRepo.findOne({
                where: { id: dto.churchId },
            });
            if (!church) throw new NotFoundException('Church no encontrada.');

            // 1. Idempotency: if already closed, return it
            const existing = await periodRepo.findOne({
                where: { churchId: dto.churchId, year: dto.year, month: dto.month },
                relations: ['accountSnapshots'],
            });

            if (existing && existing.isClosed) {
                return existing;
            }

            // 2. Period date range
            const periodStart = new Date(dto.year, dto.month - 1, 1);
            const periodEnd = new Date(dto.year, dto.month, 0, 23, 59, 59, 999);

            // 3. Check for PENDING_APPROVAL transactions in this period
            const pendingCount = await txRepo
                .createQueryBuilder('tx')
                .where('tx.churchId = :churchId', { churchId: dto.churchId })
                .andWhere('tx.date >= :start', { start: periodStart })
                .andWhere('tx.date <= :end', { end: periodEnd })
                .andWhere('tx.status = :status', {
                    status: TransactionStatus.PENDING_APPROVAL,
                })
                .andWhere('tx.deletedAt IS NULL')
                .getCount();

            if (pendingCount > 0) {
                throw new BadRequestException(
                    `Existen ${pendingCount} transacciones pendientes de aprobación en este período. Resuelva antes de cerrar.`,
                );
            }

            // 4. Try to find previous closed period for incremental calculation
            const prevPeriod = await this.findPreviousClosedPeriod(
                periodRepo,
                dto.churchId,
                dto.year,
                dto.month,
            );

            // Build a map of previous balances (accountId -> balanceAtClose)
            const prevBalances = new Map<string, number>();
            if (prevPeriod) {
                for (const snap of prevPeriod.accountSnapshots) {
                    prevBalances.set(snap.accountId, Number(snap.balanceAtClose));
                }
            }

            // 5. Fetch all accounts for this church
            const accounts = await accountRepo.find({
                where: { churchId: dto.churchId },
            });

            // 6. Calculate period movements and snapshots per account
            const snapshots: PeriodAccountSnapshot[] = [];

            for (const account of accounts) {
                // 6a. Period movements for this account
                const movements = await txRepo.query(
                    `
          SELECT
            COALESCE(SUM(CASE WHEN type = 'income'   AND "destinationAccountId" = $1 THEN amount ELSE 0 END), 0) AS "periodIncome",
            COALESCE(SUM(CASE WHEN type = 'expense'  AND "sourceAccountId" = $1      THEN amount ELSE 0 END), 0) AS "periodExpense",
            COALESCE(SUM(CASE WHEN type = 'transfer' AND "destinationAccountId" = $1 THEN amount * "exchangeRate" ELSE 0 END), 0) AS "periodTransferIn",
            COALESCE(SUM(CASE WHEN type = 'transfer' AND "sourceAccountId" = $1      THEN amount ELSE 0 END), 0) AS "periodTransferOut"
          FROM treasury_transactions
          WHERE ("sourceAccountId" = $1 OR "destinationAccountId" = $1)
            AND date >= $2
            AND date <= $3
            AND status = 'completed'
            AND "isInvalidated" = false
            AND "deletedAt" IS NULL
          `,
                    [account.id, periodStart, periodEnd],
                );

                const periodIncome = parseFloat(movements[0]?.periodIncome || '0');
                const periodExpense = parseFloat(movements[0]?.periodExpense || '0');
                const periodTransferIn = parseFloat(movements[0]?.periodTransferIn || '0');
                const periodTransferOut = parseFloat(movements[0]?.periodTransferOut || '0');

                // 6b. Calculate balanceAtClose
                let balanceAtClose: number;

                if (prevBalances.has(account.id)) {
                    // Incremental: previous balance + month movements
                    const prevBalance = prevBalances.get(account.id)!;
                    balanceAtClose =
                        prevBalance +
                        periodIncome -
                        periodExpense +
                        periodTransferIn -
                        periodTransferOut;
                } else if (prevPeriod) {
                    // Account didn't exist in previous period — SUM from beginning until periodEnd
                    balanceAtClose = await this.calculateHistoricBalance(
                        txRepo,
                        account.id,
                        periodEnd,
                    );
                } else {
                    // No previous period at all — SUM from beginning until periodEnd
                    balanceAtClose = await this.calculateHistoricBalance(
                        txRepo,
                        account.id,
                        periodEnd,
                    );
                }

                // 6c. Convert to baseCurrency (approximate using latest exchangeRate for the account's currency)
                const balanceAtCloseBaseCurrency =
                    account.currency === church.baseCurrency
                        ? balanceAtClose
                        : await this.estimateBaseCurrencyBalance(
                            txRepo,
                            account,
                            balanceAtClose,
                            periodEnd,
                        );

                const snapshot = snapshotRepo.create({
                    accountId: account.id,
                    accountName: account.name,
                    currency: account.currency,
                    balanceAtClose,
                    balanceAtCloseBaseCurrency,
                    periodIncome,
                    periodExpense,
                    periodTransferIn,
                    periodTransferOut,
                });

                snapshots.push(snapshot);
            }

            // 7. Calculate period totals (in baseCurrency)
            const totalsResult = await txRepo.query(
                `
        SELECT
          COALESCE(SUM(CASE WHEN type = 'income'  THEN "amountBaseCurrency" ELSE 0 END), 0) AS "totalIncome",
          COALESCE(SUM(CASE WHEN type = 'expense' THEN "amountBaseCurrency" ELSE 0 END), 0) AS "totalExpense"
        FROM treasury_transactions
        WHERE "churchId" = $1
          AND date >= $2
          AND date <= $3
          AND status = 'completed'
          AND "isInvalidated" = false
          AND "deletedAt" IS NULL
        `,
                [dto.churchId, periodStart, periodEnd],
            );

            const totalIncome = parseFloat(totalsResult[0]?.totalIncome || '0');
            const totalExpense = parseFloat(totalsResult[0]?.totalExpense || '0');

            // 8. Create or update ClosedPeriod
            let period: ClosedPeriod;

            if (existing && !existing.isClosed) {
                // Re-closing after reopen: update existing record
                existing.isClosed = true;
                existing.closedById = dto.userId;
                existing.closedAt = new Date();
                existing.reopenedAt = null;
                existing.reopenedById = null;
                existing.reopenReason = null;
                existing.totalIncome = totalIncome;
                existing.totalExpense = totalExpense;
                existing.netResult = totalIncome - totalExpense;

                // Delete old snapshots
                await snapshotRepo.delete({ closedPeriod: { id: existing.id } });

                period = await periodRepo.save(existing);
            } else {
                period = periodRepo.create({
                    churchId: dto.churchId,
                    year: dto.year,
                    month: dto.month,
                    isClosed: true,
                    totalIncome,
                    totalExpense,
                    netResult: totalIncome - totalExpense,
                    closedById: dto.userId,
                });
                period = await periodRepo.save(period);
            }

            // 9. Save snapshots linked to period
            for (const snap of snapshots) {
                snap.closedPeriod = period;
            }
            await snapshotRepo.save(snapshots);

            // 10. Return with snapshots
            period.accountSnapshots = snapshots;

            // 11. Audit log
            const auditRepo = manager.getRepository(TreasuryAuditLog);
            await auditRepo.save(auditRepo.create({
                churchId: dto.churchId,
                entityType: AuditEntityType.PERIOD,
                entityId: period.id,
                action: AuditAction.CLOSE_PERIOD,
                before: null,
                after: snapshotPeriod(period),
                entityVersion: 'v1',
                performedByUserId: dto.userId,
                performedByEmail: dto.userEmail || null,
                performedByRole: dto.userRole || null,
                ipAddress: dto.ipAddress || null,
            }));

            return period;
        });
    }

    /**
     * Find the most recent closed period BEFORE the given year/month.
     */
    private async findPreviousClosedPeriod(
        repo: any,
        churchId: string,
        year: number,
        month: number,
    ): Promise<ClosedPeriod | null> {
        // Previous month
        let prevYear = year;
        let prevMonth = month - 1;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear--;
        }

        return repo.findOne({
            where: { churchId, year: prevYear, month: prevMonth, isClosed: true },
            relations: ['accountSnapshots'],
        });
    }

    /**
     * Calculate account balance from beginning of time until a given date.
     * Used only for the first period close or for new accounts.
     */
    private async calculateHistoricBalance(
        txRepo: any,
        accountId: string,
        untilDate: Date,
    ): Promise<number> {
        const result = await txRepo.query(
            `
      SELECT COALESCE(SUM(
        CASE
          WHEN type = 'income'   AND "destinationAccountId" = $1 THEN amount
          WHEN type = 'expense'  AND "sourceAccountId" = $1      THEN -amount
          WHEN type = 'transfer' AND "destinationAccountId" = $1 THEN amount * "exchangeRate"
          WHEN type = 'transfer' AND "sourceAccountId" = $1      THEN -amount
          ELSE 0
        END
      ), 0) AS balance
      FROM treasury_transactions
      WHERE ("sourceAccountId" = $1 OR "destinationAccountId" = $1)
        AND date <= $2
        AND status = 'completed'
        AND "isInvalidated" = false
        AND "deletedAt" IS NULL
      `,
            [accountId, untilDate],
        );

        return parseFloat(result[0]?.balance || '0');
    }

    /**
     * Estimate balance in base currency using the most recent exchangeRate
     * from the period for this account's currency.
     */
    private async estimateBaseCurrencyBalance(
        txRepo: any,
        account: Account,
        balance: number,
        periodEnd: Date,
    ): Promise<number> {
        const result = await txRepo.query(
            `
      SELECT "exchangeRate"
      FROM treasury_transactions
      WHERE currency = $1
        AND "churchId" = $2
        AND date <= $3
        AND status = 'completed'
        AND "isInvalidated" = false
        AND "deletedAt" IS NULL
      ORDER BY date DESC
      LIMIT 1
      `,
            [account.currency, account.churchId, periodEnd],
        );

        const rate = parseFloat(result[0]?.exchangeRate || '1');
        return balance * rate;
    }
}
