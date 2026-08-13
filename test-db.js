const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:123456@localhost:5432/saas_iglesia' });
pool.query('SELECT id, title, "leaderId" FROM "mission_projects" ORDER BY "createdAt" DESC LIMIT 1')
  .then(r => { console.log(r.rows); pool.end(); })
  .catch(console.error);
