import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TreasuryTransaction } from './entities/treasury-transaction.entity';
import { Account } from './entities/account.entity';
import { TransactionType, AccountType } from './enums/treasury.enums';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(TreasuryTransaction) private txRepo: Repository<TreasuryTransaction>,
        @InjectRepository(Account) private accountRepo: Repository<Account>,
        private dataSource: DataSource
    ) { }

    async getSummary(churchId: string, startDate: string, endDate: string) {
        const result = await this.txRepo
            .createQueryBuilder('tx')
            .select('SUM(CASE WHEN tx.type = :income THEN tx.amountBaseCurrency ELSE 0 END)', 'totalIncome')
            .addSelect('SUM(CASE WHEN tx.type = :expense THEN tx.amountBaseCurrency ELSE 0 END)', 'totalExpense')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .setParameters({ income: TransactionType.INCOME, expense: TransactionType.EXPENSE })
            .getRawOne();

        const income = parseFloat(result.totalIncome || '0');
        const expense = parseFloat(result.totalExpense || '0');

        // Calculate previous period for trends (simplified: same duration before)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = end.getTime() - start.getTime();
        const prevStart = new Date(start.getTime() - duration);
        const prevEnd = new Date(end.getTime() - duration);

        const prevResult = await this.txRepo
            .createQueryBuilder('tx')
            .select('SUM(CASE WHEN tx.type = :income THEN tx.amountBaseCurrency ELSE 0 END)', 'totalIncome')
            .addSelect('SUM(CASE WHEN tx.type = :expense THEN tx.amountBaseCurrency ELSE 0 END)', 'totalExpense')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.date BETWEEN :prevStart AND :prevEnd', { prevStart, prevEnd })
            .setParameters({ income: TransactionType.INCOME, expense: TransactionType.EXPENSE })
            .getRawOne();

        const prevIncome = parseFloat(prevResult.totalIncome || '0');
        const prevExpense = parseFloat(prevResult.totalExpense || '0');
        const prevNet = prevIncome - prevExpense;

        return {
            income: { value: income, previous: prevIncome, change: this.calcChange(income, prevIncome) },
            expense: { value: expense, previous: prevExpense, change: this.calcChange(expense, prevExpense) },
            net: { value: income - expense, previous: prevNet, change: this.calcChange(income - expense, prevNet) }
        };
    }

    private calcChange(current: number, previous: number) {
        if (previous === 0) return current === 0 ? 0 : 100;
        return ((current - previous) / Math.abs(previous)) * 100;
    }

    async getCashflow(churchId: string, startDate: string, endDate: string) {
        // Group by Month (using date_trunc or format depending on DB. Assuming Postgres)
        return this.txRepo.query(`
            SELECT 
                TO_CHAR(date, 'YYYY-MM') as month,
                SUM(CASE WHEN type = '${TransactionType.INCOME}' THEN "amountBaseCurrency" ELSE 0 END) as income,
                SUM(CASE WHEN type = '${TransactionType.EXPENSE}' THEN "amountBaseCurrency" ELSE 0 END) as expense
            FROM treasury_transactions
            WHERE "churchId" = $1 AND date BETWEEN $2 AND $3
            GROUP BY TO_CHAR(date, 'YYYY-MM')
            ORDER BY month ASC
        `, [churchId, startDate, endDate]);
    }

    async getCategoryBreakdown(churchId: string, startDate: string, endDate: string, type: TransactionType) {
        return this.txRepo.createQueryBuilder('tx')
            .leftJoinAndSelect('tx.category', 'cat')
            .select('cat.name', 'name')
            .addSelect('cat.color', 'color')
            .addSelect('SUM(tx.amountBaseCurrency)', 'value')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.type = :type', { type })
            .andWhere('tx.date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .groupBy('cat.id')
            .addGroupBy('cat.name')
            .addGroupBy('cat.color')
            .orderBy('value', 'DESC')
            .getRawMany();
    }

    async getMinistryBreakdown(churchId: string, startDate: string, endDate: string) {
        return this.txRepo.createQueryBuilder('tx')
            .leftJoinAndSelect('tx.ministry', 'min')
            .select('min.name', 'name')
            .addSelect('SUM(tx.amountBaseCurrency)', 'value')
            .where('tx.churchId = :churchId', { churchId })
            .andWhere('tx.type = :expense', { expense: TransactionType.EXPENSE })
            .andWhere('tx.date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('tx.ministryId IS NOT NULL')
            .groupBy('min.id')
            .addGroupBy('min.name')
            .orderBy('value', 'DESC')
            .getRawMany();
    }

    async getAccountBalances(churchId: string) {
        const accounts = await this.accountRepo.find({
            where: { church: { id: churchId }, type: AccountType.ASSET }
        });

        // Calculate change vs last month could be complex without historical snapshots.
        // For MVP, just return current balance.
        return accounts.map(acc => ({
            id: acc.id,
            name: acc.name,
            balance: Number(acc.balance),
            currency: acc.currency
        }));
    }

    async getTrendAnalysis(churchId: string, months: number = 12) {
        // Last X months net result
        return this.txRepo.query(`
            SELECT 
                TO_CHAR(date, 'YYYY-MM') as month,
                SUM(CASE WHEN type = '${TransactionType.INCOME}' THEN "amountBaseCurrency" ELSE 0 END) - 
                SUM(CASE WHEN type = '${TransactionType.EXPENSE}' THEN "amountBaseCurrency" ELSE 0 END) as net
            FROM treasury_transactions
            WHERE "churchId" = $1 AND date >= NOW() - INTERVAL '${months} months'
            GROUP BY TO_CHAR(date, 'YYYY-MM')
            ORDER BY month ASC
        `, [churchId]);
    }

    async generateMonthlyReport(churchName: string, transactions: TreasuryTransaction[], accounts: Account[]): Promise<Buffer> {
        // Placeholder for report generation (PDF/Excel)
        // For now, returning a simple text buffer to satisfy compilation
        const reportContent = `Monthly Report for ${churchName}\n\nTransactions: ${transactions.length}\nAccounts: ${accounts.length}`;
        return Buffer.from(reportContent, 'utf-8');
    }
}
