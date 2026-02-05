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

    console.log(`Testing connection to ${currentConfig.host}...`);
    const client = new Client(currentConfig);

    try {
        await client.connect();
        console.log(`✅ Success! Connected to ${currentConfig.host}`);
        await client.end();
        return true;
    } catch (err) {
        console.error(`❌ Failed to connect to ${currentConfig.host}:`, err.message);
        if (err.code) console.error(`   Code: ${err.code}`);
        await client.end();
        return false;
    }
}

(async () => {
    console.log('--- Database Connection Test ---');
    const localhostSuccess = await testConnection('localhost');

    if (!localhostSuccess) {
        console.log('\nRetrying with 127.0.0.1...');
        const ipv4Success = await testConnection('127.0.0.1');

        if (ipv4Success) {
            console.log('\n💡 SUGGESTION: Start using "127.0.0.1" instead of "localhost" in your .env file.');
        } else {
            console.log('\n⚠️ Both localhost and 127.0.0.1 failed. Please check your password or if Postgres is running.');
        }
    }
})();
