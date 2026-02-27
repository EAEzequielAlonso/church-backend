
import { DataSource } from 'typeorm';
import { TreasuryTransaction } from './src/treasury/entities/treasury-transaction.entity';
import { TransactionCategory } from './src/treasury/entities/transaction-category.entity';
import { Account } from './src/treasury/entities/account.entity';
import { Church } from './src/churches/entities/church.entity';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
    console.log("Connecting to DB...");
    // Hardcode or use env vars - trying standard defaults if env fails
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'saas_iglesia',
        entities: [TreasuryTransaction, TransactionCategory, Account, Church],
        synchronize: false,
        logging: false
    });

    try {
        await ds.initialize();
        console.log("Connected!");

        const txCount = await ds.getRepository(TreasuryTransaction).count();
        const catCount = await ds.getRepository(TransactionCategory).count();
        const accCount = await ds.getRepository(Account).count();

        console.log(`Transactions found: ${txCount}`);
        console.log(`Categories found: ${catCount}`);
        console.log(`Accounts found: ${accCount}`);

        // Also check if they are linked to a church?
        const txs = await ds.getRepository(TreasuryTransaction).find({ take: 3, relations: ['church', 'category'] });
        console.log('First 3 Txs:', JSON.stringify(txs, null, 2));

    } catch (error) {
        console.error("Error checking DB:", error);
    } finally {
        await ds.destroy();
    }
}

verify();
