const { Client } = require('pg');

const config = {
    user: 'postgres',
    password: 'Salvoportuamor.0',
    host: 'localhost',
    port: 5432,
    database: 'church_db',
};

async function testConnection(hostOverride) {
    const currentConfig = { ...config };
    if (hostOverride) currentConfig.host = hostOverride;

    console.log(`[TEST] Connecting to ${currentConfig.host} on port ${currentConfig.port}...`);
    const client = new Client(currentConfig);

    try {
        await client.connect();
        console.log(`[SUCCESS] Connected to ${currentConfig.host}`);
        await client.end();
        return true;
    } catch (err) {
        console.error(`[ERROR] Failed ${currentConfig.host}: ${err.message} (Code: ${err.code})`);
        await client.end();
        return false;
    }
}

(async () => {
    // Print password details to check for invisible chars
    console.log(`Password length: ${config.password.length}`);
    console.log(`Password codes: ${config.password.split('').map(c => c.charCodeAt(0)).join(',')}`);

    const localhost = await testConnection('localhost');
    const ipv4 = await testConnection('127.0.0.1');

    if (!localhost && ipv4) {
        console.log('RECOMMENDATION: Change DB_HOST to 127.0.0.1');
    }
})();
