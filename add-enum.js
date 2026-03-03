const { Client } = require('pg');
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'church_db',
    password: '123456',
    port: 5432,
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to DB");

        // Check if enum exists
        const res = await client.query(`SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'calendar_events_type_enum')`);
        const labels = res.rows.map(r => r.enumlabel);

        // Values to check and add
        const requiredValues = ['DISCIPLESHIP', 'FOLLOW_UP', 'COURSE', 'ACTIVITY'];

        for (const val of requiredValues) {
            if (!labels.includes(val)) {
                console.log(`Adding ${val} to calendar_events_type_enum...`);
                await client.query(`ALTER TYPE calendar_events_type_enum ADD VALUE '${val}'`);
            } else {
                console.log(`${val} already exists.`);
            }
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}
run();
