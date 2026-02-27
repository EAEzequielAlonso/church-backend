
const { Client } = require('pg');

async function verify() {
    console.log("Connecting to DB with kv-pg...");

    // Default NestJS/Postgres values
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'saas_iglesia',
    });

    try {
        await client.connect();
        console.log("Connected to Postgres!");

        const txRes = await client.query('SELECT count(*) FROM treasury_transactions');
        console.log('Treasury Transactions:', txRes.rows[0].count);

        const accRes = await client.query('SELECT count(*) FROM treasury_accounts'); // Table name might be 'accounts'?
        // Entity says @Entity('treasury_transactions'). Account entity?
        // Let's check table names by querying information_schema

        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%account%'
        `);
        console.log('Tables found:', tablesRes.rows.map(r => r.table_name));

        const catRes = await client.query('SELECT count(*) FROM treasury_transaction_categories'); // Guessing name
        console.log('Categories (Check table name below):', catRes.rows[0]?.count || 'Error');

    } catch (err) {
        console.error("DB Error:", err.message);
        // Try to list all tables to helps debug
        try {
            const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            console.log("All Tables:", res.rows.map(r => r.table_name).join(', '));
        } catch (e) { }
    } finally {
        await client.end();
    }
}

verify();
