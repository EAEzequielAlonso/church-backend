const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:123456@localhost:5432/church_db' });

client.connect().then(() => {
  return client.query('SELECT "personId", COUNT(*) FROM need_signals GROUP BY "personId" HAVING COUNT(*) > 1;');
}).then(res => {
  console.log(JSON.stringify(res.rows));
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
